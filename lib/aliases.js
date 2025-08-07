const aliases = {
  darwin: ['mac', 'macos', 'osx', 'dmg'],  // Add dmg as darwin alias
  win32: ['windows', 'win', 'exe'],         // Map win32 correctly
  linux: ['AppImage', 'appimage'],          // Add linux platform
  deb: ['debian'],
  rpm: ['fedora'],
  exe: ['win32', 'windows', 'win']          // Keep exe mapping for backward compatibility
}

for (const existingPlatform of Object.keys(aliases)) {
  const newPlatform = existingPlatform + '_arm64';
  aliases[newPlatform] = aliases[existingPlatform].map(alias => `${alias}_arm64`);
}

module.exports = platform => {
  if (typeof aliases[platform] !== 'undefined') {
    return platform
  }

  for (const guess of Object.keys(aliases)) {
    const list = aliases[guess]

    if (list.includes(platform)) {
      return guess
    }
  }

  return false
}
