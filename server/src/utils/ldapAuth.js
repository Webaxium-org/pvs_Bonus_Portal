import { Client } from 'ldapts';

// RFC 4515 — escape special characters in LDAP filter assertion values
const escapeLdapValue = (value) =>
  value.replace(/[\\\0()*]/g, (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`);

export const authenticateLDAP = async (email, password) => {
  const ldapServer = process.env.HRPORTAL_LDAP_Server;
  const baseDN = process.env.HRPORTAL_LDAP_BaseDN;
  const adminUser = process.env.HRPORTAL_LDAP_User;
  const adminPassword = process.env.HRPORTAL_LDAP_PW;

  if (!ldapServer || !baseDN || !adminUser || !adminPassword) {
    throw new Error('LDAP configuration is missing in environment variables');
  }

  const tlsOptions = ldapServer.startsWith('ldaps://') ? { rejectUnauthorized: true } : undefined;

  const client = new Client({
    url: ldapServer,
    timeout: 5000,
    connectTimeout: 5000,
    ...(tlsOptions && { tlsOptions }),
  });

  try {
    // Step 1: Bind with service account to search for the user
    await client.bind(adminUser, adminPassword);

    // Step 2: Search for user by email — values are escaped to prevent LDAP injection
    const safeEmail = escapeLdapValue(email);
    const safeUsername = escapeLdapValue(email.split('@')[0]);

    const searchFilter = `(|(userPrincipalName=${safeEmail})(mail=${safeEmail})(sAMAccountName=${safeUsername}))`;

    const searchOptions = {
      filter: searchFilter,
      scope: 'sub',
      attributes: ['dn', 'cn', 'mail', 'userPrincipalName', 'sAMAccountName', 'displayName', 'givenName', 'sn'],
    };

    const { searchEntries } = await client.search(baseDN, searchOptions);

    if (searchEntries.length === 0) {
      await client.unbind();
      // Use the same error text as a wrong-password failure to prevent username enumeration
      throw new Error('Invalid credentials');
    }

    const userEntry = searchEntries[0];
    const userDN = userEntry.dn;

    // Extract user info
    const userInfo = {
      dn: userDN,
      email: userEntry.mail || userEntry.userPrincipalName || email,
      displayName: userEntry.displayName || userEntry.cn,
      firstName: userEntry.givenName || '',
      lastName: userEntry.sn || '',
      username: userEntry.sAMAccountName || safeUsername,
    };

    // Unbind admin connection
    await client.unbind();

    // Step 3: Try to bind with user's credentials to verify password
    const userClient = new Client({
      url: ldapServer,
      timeout: 5000,
      connectTimeout: 5000,
      ...(tlsOptions && { tlsOptions }),
    });

    try {
      await userClient.bind(userDN, password);
      await userClient.unbind();

      return {
        success: true,
        user: userInfo,
      };
    } catch (bindError) {
      console.error('LDAP user bind error:', bindError.message);
      try { await userClient.unbind(); } catch (_) {}
      throw new Error('Invalid credentials');
    }
  } catch (error) {
    console.error('LDAP Auth Error:', error.message);
    try {
      await client.unbind();
    } catch (unbindError) {
      // Ignore unbind errors
    }
    throw error;
  }
};

/**
 * Test LDAP connection
 * @returns {Promise<boolean>}
 */
export const testLDAPConnection = async () => {
  const ldapServer = process.env.HRPORTAL_LDAP_Server;
  const adminUser = process.env.HRPORTAL_LDAP_User;
  const adminPassword = process.env.HRPORTAL_LDAP_PW;

  if (!ldapServer || !adminUser || !adminPassword) {
    throw new Error('LDAP configuration is missing');
  }

  const client = new Client({
    url: ldapServer,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(adminUser, adminPassword);
    await client.unbind();
    return true;
  } catch (error) {
    try {
      await client.unbind();
    } catch (unbindError) {
      // Ignore unbind errors
    }
    throw error;
  }
};
