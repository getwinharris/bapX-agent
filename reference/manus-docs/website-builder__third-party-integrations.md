> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Third-Party Integrations

> Connect Stripe, Google Maps, or any REST API—secure keys, simple natural‑language setup.

Manus allows you to extend the functionality of your web application by integrating with a variety of third-party services. This enables you to build more powerful and feature-rich applications without leaving the conversational interface.

### Stripe

Integrate a complete, secure, and production-ready payment system with Stripe. Manus handles the entire process, from creating products and subscription models to configuring webhooks and testing the checkout flow. For more details, see the dedicated "[Payments](payments)" section.

### Google Maps

Incorporate location-based features into your application with Google Maps. You can:

* Display interactive maps.
* Show the location of your business or points of interest.
* Build features like store locators or delivery tracking.

To add a map, simply describe where you want it and what it should display, for example:

> "Add a Google Map to the contact page showing our office location at 1600 Amphitheatre Parkway, Mountain View, CA."

### Custom API

Connect to any third-party service with a REST API to pull in external data or trigger actions in other systems. Manus can handle the authentication and make requests to the API on your behalf. To set up a custom integration, you will need to provide the API endpoint, authentication details (such as an API key), and a description of the data you want to access or the actions you want to perform.

### API Secrets: Securely Manage Your Keys

When integrating with third-party services, such as Google Maps or a custom API, you will often need to use API keys or other secrets to authenticate your requests. Manus provides a secure way to manage these secrets, ensuring they are not exposed in your frontend code.

### Adding API Secret key

You can add API secret key to your project by providing them to Manus in the conversational interface. Manus will store these secret key securely and use them to make authenticated requests on your behalf from the backend.

For example, when setting up a custom API integration, you might say:

> "I need to connect to a custom API. The API key is YOUR\_API\_KEY. Please use this key in the Authorization header for all requests."

Manus will store the API key as an environment variable on the server and will not expose it in the client-side code. This ensures that your secrets remain confidential and your application is secure.