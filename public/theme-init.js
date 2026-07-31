try {
  if (localStorage.getItem('Malama_dark_mode') === 'true') {
    document.documentElement.classList.add('dark');
  }
} catch {
  // Preferencia de tema e opcional.
}
