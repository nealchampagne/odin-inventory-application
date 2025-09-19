const capFirst = str => {
  return (str && str.length)
    ? str.charAt(0).toUpperCase() + str.slice(1)
    : '';
}

module.exports = { capFirst };