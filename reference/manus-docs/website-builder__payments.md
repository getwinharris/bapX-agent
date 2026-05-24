> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

> How to monetize your builds

# Payments

# Stripe Integration: Effortless Payments

Manus revolutionizes how you integrate payments by partnering with Stripe to offer a "build first, sign up later" workflow. This eliminates the traditional friction of setting up a payments system, allowing you to go from idea to income in a fraction of the time.

### The Traditional Problem

Typically, accepting online payments requires a multi-step, technical process: you must first sign up for a payment provider, navigate complex dashboards to configure products and webhooks, build and test your integration, and only then can you deploy your application. This process can take days or even weeks and often requires specialized expertise.

### The Manus Solution: Build First, Sign Up Later

Manus flips the traditional model on its head. You can start building your application and integrating payment functionality immediately. The moment you decide to add payments, Manus automatically creates a **Stripe claimable sandbox** for you. This is a temporary, fully-featured Stripe account that requires no initial signup.

This approach provides several key advantages:

* **Zero-Friction Start**: Begin building and testing your payment flows instantly without the barrier of a signup form.
* **Complete Testing Environment**: The sandbox replicates Stripe's live environment, allowing you to test your entire checkout process, including subscriptions and payment confirmations, without using real money.
* **Designed for AI Agents**: This technology allows Manus to securely build and configure your entire payment system on your behalf in a controlled environment.

### What Manus Handles Automatically

When you ask Manus to add payments, it acts as your personal payments specialist, handling the complex configuration tasks for you:

<img src="https://mintcdn.com/docs-manus/rKYAjXCWrEKiD9vH/images/image(8).png?fit=max&auto=format&n=rKYAjXCWrEKiD9vH&q=85&s=aaa416df0d373dd29943ed43d3460272" alt="Image(8) Pn" width="1752" height="1144" data-path="images/image(8).png" />

* **Automated Product Setup**: Manus translates your business logic into the corresponding products and subscription models in your Stripe sandbox.
* **Webhook Configuration**: It automatically sets up the necessary webhooks to ensure seamless communication between your application and Stripe for events like successful payments.
* **End-to-End Testing**: The entire checkout flow is built and tested in the sandbox, ensuring everything works as expected before you go live.

### Step-by-Step: Adding Payments

1. **Tell Manus Your Goal**: Simply state what you want to sell, for example: `"Add Stripe payments for a premium subscription at $49/month."`
2. **Manus Sets Up the Sandbox**: Manus will create the claimable sandbox and configure all the necessary products, pricing, and webhooks.
3. **Test Your Checkout Flow**: You can test the entire payment process in the live preview to ensure everything is working correctly.
4. **Go Live**: When you are satisfied, tell Manus: `"I'm ready to go live with payments."` You will then be prompted to "claim" the sandbox, which involves creating your official Stripe account and completing their secure Know Your Customer (KYC) process. All the configurations Manus created are seamlessly transferred to your new, permanent Stripe account, ready to accept real payments instantly.