> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# GitHub Integration

> Export your Manus project to a private GitHub repo, then keep working from either place. Manus and GitHub stay in step by automatically sending new changes and pulling the latest updates, so you can use your favorite coding tools without losing sync.

Think of GitHub as a cloud-based service for storing and managing code. Much like you might use Google Docs to write and save documents online, developers use GitHub to save their code, track changes over time, and collaborate with others.

Every project on GitHub is stored in a repository, which is like a folder for your project. Inside, you can find all the code files and a full history of every change that has been made. This makes it a powerful tool for version control and teamwork in software development.

## Connect your Manus project to GitHub

<img src="https://mintcdn.com/docs-manus/OMZXVO9ke2Xqfh0m/images/Untitleddesign(2).jpg?fit=max&auto=format&n=OMZXVO9ke2Xqfh0m&q=85&s=5705ab0a4fe23874d0d70f10c149cd45" alt="Untitled Design (2)" width="1920" height="1080" data-path="images/Untitleddesign(2).jpg" />

GitHub Integration allows you to export your Manus project's code to a new, private GitHub repository.

Once exported, a two-way sync is established between your Manus workspace and the GitHub repository.

<img src="https://mintcdn.com/docs-manus/OMZXVO9ke2Xqfh0m/images/Screenshot2025-12-26at5.55.39PM.png?fit=max&auto=format&n=OMZXVO9ke2Xqfh0m&q=85&s=64afb9212a5bee56d18b5a5ccf7f03a0" alt="Screenshot 2025 12 26 At 5 55 39 PM" width="736" height="468" data-path="images/Screenshot2025-12-26at5.55.39PM.png" />

This gives you the best of both worlds: the power of AI-driven development in Manus and the flexibility of working on your code in your own environment.

## How to Use It

1. Authorization: In your project's dashboard, click the GitHub icon in the top-right corner or navigate to the GitHub tab under Settings. If you haven't connected your GitHub account before, you will be prompted to authorize the connection.
2. Export to a New Repository: Once your account is connected, choose an owner (you or an organization you belong to) and a name for the new repository before clicking on "Create Repository". This action creates a new private repository in your GitHub account containing all of your project's code. Manus is automatically granted the necessary permissions to sync with this new repository.

Warning: Changing the repository's owner or name on GitHub after it has been created will break the connection with Manus.

<iframe />

* Sync Your Code: With the repository created, Manus keeps your project and the main branch of your GitHub repository in sync automatically.

* Automatic Push: When Manus generates or modifies code in your project, the changes are automatically pushed to the main branch.

* Automatic Pull: Before making any new code changes, Manus first pulls the latest version from the main branch to reduce the risk of conflicts.

* Manual Sync & Status Check: You can check the sync status at any time by clicking the GitHub icon. From there, you can also manually trigger a pull to ensure your Manus project is up-to-date with any changes you've made directly on GitHub.

## What You Need to Know

Once your code is on GitHub, you have full control. You can clone the repository to your local machine, make edits in your favorite IDE, and push your changes back to the main branch on GitHub. When you return to Manus, it will pull those updates before making its next set of changes, which helps keep your work in sync and reduces the chances of overwriting your manual edits.

Tip: Use Manus to generate the initial boilerplate and structure for your application. Then, export your code to GitHub and use your favorite IDE for the finishing touches and detailed implementation. Once you are ready, sync your work back to Manus for easy deployment and hosting.

## GitHub Connector Capabilities

Connecting your project to GitHub also activates the GitHub Connector, giving Manus the ability to help you manage your repository directly from the Manus interface. The permissions granted allow Manus to perform several common actions on your behalf:

* Manage Code: Read and write code, commit changes, and handle push/pull operations to keep your repository synced.
* Handle Issues: Create, view, edit, and close issues in your repository.
* Work with Pull Requests: Create, view, edit, and close pull requests.
* Organize Projects: Interact with your repository's project boards.

These capabilities allow for a more integrated workflow, where you can manage your development lifecycle without constantly switching between Manus and GitHub.

## Disconnecting the Integration

If you wish to stop syncing your project with GitHub, you can disconnect the integration from your project settings. Disconnecting will not delete your GitHub repository; it simply stops Manus from pushing or pulling any further changes. You will retain full ownership of the repository on GitHub, but your Manus project will no longer be connected to it.

## FAQ

<AccordionGroup>
  <Accordion title="What should I do if I get a &#x22;GitHub authorization failed&#x22; error?">
    This error can occur for two main reasons:

    1. Your connection needs to be refreshed. To resolve this, go to your project settings, disconnect your GitHub account, and then reconnect it.
    2. Manus does not have permission to access the repository. This can happen if you are trying to sync with a repository that was not originally created through the Manus export feature, or if the repository's name or owner was changed after creation. Ensure you are working with the repository that Manus created for your project under its original name and owner.
  </Accordion>
</AccordionGroup>