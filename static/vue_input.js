document.addEventListener('DOMContentLoaded', function () {
    const app = Vue.createApp({
        data() {
            return {
                message: 'Hello, Vue 3!'
            };
        }
    });

    app.mount('.app');
});
