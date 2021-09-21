self.addEventListener('fetch', event => {
    // fires whenever the app requests a resource (file or data)
    console.log(`SW: Fetching ${event.request.url}`);
});
