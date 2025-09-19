window.capFirst = str =>
  str && str.length
    ? str.charAt(0).toUpperCase() + str.slice(1)
    : '';