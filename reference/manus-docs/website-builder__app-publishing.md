> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# App Publishing (mobile)

## What it is

<iframe src="https://www.youtube.com/embed/SR0A84KdYJw" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

App Publishing for Mobile (also known as App Sharing and Testing) is a powerful feature that closes the gap between building your mobile app and getting it into the hands of real users for testing. It is not a one-click “publish to store” button, but rather a guided workflow that automates the complex, technical steps of packaging and preparing your app for the Google Play Store and Apple's TestFlight.

This feature solves a major bottleneck for creators by handling the tedious work of creating testable builds. Instead of spending days navigating platform-specific requirements, you can get a live version of your app onto a real device in minutes, allowing you to accelerate your feedback loop and stay focused on improving your product.

## How to use it

Getting your mobile app ready for testers is a straightforward process within Manus. The steps differ slightly between Android and iOS.

### For Android (Google Play)

1. In your Manus workspace, navigate to the Publish to Google Play section.
2. Manus will automatically package your application into the required Android App Bundle (AAB) format.
3. Follow the provided link to your Google Play Console, where you can upload the AAB file and manage your testing tracks (e.g., Internal, Closed, Open) and eventual store release.

### For iOS (TestFlight)

1. First, ensure you have an active Apple Developer account.
2. In your Manus workspace, go to Publish, select the iOS tab, and click Create app.
3. Follow the on-screen instructions. Manus will handle the entire backend process: creating the app in your developer account, packaging the build, and uploading it directly to App Store Connect.
4. Once Apple has processed the build, you will receive an email notification from TestFlight. You can then install the app on your own device and use App Store Connect to invite other internal or external testers to do the same.

## What you need to know

* Developer Accounts are Required: To use this feature, you must have the appropriate developer account for the platform you are targeting. An Apple Developer account is mandatory for distributing apps via TestFlight, and a Google Play Developer account is required to upload builds to the Play Console.
* This is a Testing Feature, Not Direct Publishing: It is critical to understand that this feature prepares and uploads your app for testing in a controlled environment. The final step of making your app public on the App Store or Google Play is a separate process that you control entirely from within your respective developer accounts.
* Guided Workflow: The feature provides clear, step-by-step guidance, demystifying the path to launch by handling the most complex initial steps for you.
* Availability: App Publishing for Mobile is available to all Manus users with the Develop Apps capability enabled.

## Tips

* Gather Feedback Early and Often: The primary purpose of this feature is to accelerate your feedback loop. Use it to get your app in front of real users as early as possible to inform your design and development decisions.
* Prepare Your App Store Assets: While Manus automates the technical build process, you will still need to prepare your App Store and Google Play listing materials, such as screenshots, app descriptions, privacy policies, and keywords. It's a good idea to start working on these while your testers are providing feedback.
* Understand App Store Review Guidelines: Familiarize yourself with the review guidelines for both the Apple App Store and Google Play Store. Adhering to these rules is crucial for a smooth final submission process.

## FAQ

<AccordionGroup>
  <Accordion title="Does this feature publish my app directly to the App Store or Google Play?">
    No. This feature prepares and uploads your app for testing in a controlled environment (TestFlight for iOS and the Google Play Console for Android). Publishing your app to be live on the App Store or Google Play is a separate process that you control through your respective developer accounts.
  </Accordion>

  <Accordion title="Do I need a developer account to use this feature?">
    Yes. An Apple Developer account is required for sharing an iOS app, and a Google Play Developer account is required for sharing an Android app.
  </Accordion>

  <Accordion title="What is the difference between the Android and iOS process in Manus?">
    For Android, Manus packages the app into an AAB file for you to upload to the Google Play Console. For iOS, Manus provides a more integrated experience by directly uploading the build to App Store Connect and initiating the TestFlight process for you.
  </Accordion>

  <Accordion title="How do I invite testers to my iOS app?">
    After Manus uploads your build, you will receive an email from TestFlight. You can then log in to App Store Connect to manage your tester lists and send out invitations.
  </Accordion>
</AccordionGroup>