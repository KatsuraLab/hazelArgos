// Native
const { extname } = require('path')

module.exports = fileName => {
  const extension = extname(fileName).slice(1)
  const arch = (fileName.includes('arm64') || fileName.includes('aarch64')) ? '_arm64' : ''

  // Map .dmg files to darwin platform for macOS compatibility
  if (extension === 'dmg') {
    return 'darwin' + arch
  }

  // Map .AppImage files to linux platform for Linux compatibility  
  if (extension === 'AppImage') {
    return 'linux' + arch
  }

  // Handle macOS .zip files
  if (
    (fileName.includes('mac') || fileName.includes('darwin')) &&
    extension === 'zip'
  ) {
    return 'darwin' + arch
  }

  // Handle Windows .exe files
  if (extension === 'exe') {
    return 'win32'
  }

  // Handle other Linux formats
  const linuxFormats = ['rpm', 'deb']
  if (linuxFormats.includes(extension)) {
    return extension + arch
  }

  return false
}
