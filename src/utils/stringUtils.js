function capitalize(str = '') {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}


function formatUserName(user) {
  const fn = capitalize(user.firstName);
  const ln = capitalize(user.lastName);
  return [fn, ln].filter(Boolean).join(' ');
}

module.exports = { capitalize, formatUserName };
