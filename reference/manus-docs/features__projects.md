> ## Documentation Index
> Fetch the complete documentation index at: https://manus.im/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Projects

> Projects let you create persistent workspaces with shared instructions and files, so every new task starts with the right context. Organize recurring workflows, collaborate with your team, and eliminate repetitive setup.

## What it is

Manus Projects is a feature that allows you to create persistent, reusable workflows for recurring tasks. A project serves as a dedicated workspace where you can define a **master instruction** and build a **knowledge base** of files and documents. These configurations are automatically applied to every new task created within that project, eliminating the need for repetitive setup.

<iframe src="https://www.youtube.com/embed/K_Mtz-w_nv8" title="YouTube video player" frameborder="0" className="w-full aspect-video rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen />

Projects are designed to solve a common challenge: the work itself may be repeatable, but the setup often is not. By centralizing your instructions and resources in a project, you can ensure consistency across tasks and enable seamless collaboration with your team.

## How to use it

### Creating a Project

To create a new project, follow these steps:

1. Click the **"Create Project"** button (the "+" icon next to "Projects") in your workspace sidebar.
2. Enter a **name** for your project and write the **master instruction** that defines the workflow.
3. Add your **knowledge base** by uploading relevant files and documents.
4. Start creating tasks within your project. Each new task will automatically inherit the project's configuration.

### Pinning a Project

To keep your most frequently used projects easily accessible, you can pin them to the top of your project list. Hover over a project in the sidebar and click the **pin icon** that appears. Pinned projects will always remain at the top, regardless of how you sort the rest of your list.

### Drag and Drop to Organize

You can manually organize your projects by dragging and dropping them into your preferred order. This allows you to prioritize your work and arrange your workspace in a way that reflects your current focus.

### Filtering Tasks

Manus provides a filtering mechanism to help you manage your tasks. Click the filter icon in the task list header to access the following options:

| Filter Option         | Description                                                               |
| :-------------------- | :------------------------------------------------------------------------ |
| **All tasks**         | Displays all tasks, including those within projects and standalone tasks. |
| **Non-project tasks** | Displays only tasks that are not associated with any project.             |
| **Favorites**         | Displays tasks you have marked as favorites.                              |
| **Scheduled**         | Displays tasks that have been scheduled for a specific time.              |

This is particularly useful for quickly locating standalone tasks that exist outside of your project structure.

***

## What You Need to Know

### Collaboration and Privacy

Projects and individual tasks are **private by default**. When you invite a colleague to a project, they gain access to the shared master instruction and knowledge base. However, they can only see the tasks they have created themselves within that project. To share a specific task, you must explicitly invite them to that task separately.

### Configuration Updates

When a project's configuration is updated, the changes propagate as follows:

| Update Type             | When it Takes Effect                                         |
| :---------------------- | :----------------------------------------------------------- |
| **Instruction updates** | Apply the next time you send a message in your current task. |
| **File updates**        | Only take effect in new tasks created after the update.      |

All previously created tasks remain unaffected and will continue to use the configuration that existed when they were created.

### Availability

Projects are available to all users across all subscription tiers.

***

## Tips

* **Create projects for different types of recurring work.** For example, you could have separate projects for weekly reports, content creation, competitive analysis, and code reviews.
* **Use clear and descriptive names.** A well-named project is easier to find and helps team members understand its purpose at a glance.
* **Write detailed master instructions.** The more specific your instructions, the less context you need to provide in each new task.
* **Keep your knowledge base current.** Regularly update your project files to ensure everyone on your team is working with the latest information.
* **Pin your most active projects.** This keeps them at the top of your sidebar for quick access.

***

## FAQ

<AccordionGroup>
  <Accordion title="When I invite someone to a Project, what can they see?">
    Both projects and individual tasks are private by default. You control what you share. When you invite someone to a project, they gain access to the shared master instruction and knowledge base, but they can only see tasks they have created themselves. To share a specific task, you need to explicitly invite them to that task separately.
  </Accordion>

  <Accordion title="If the project creator updates the configuration, how does it affect other members?">
    It depends on what was updated. Instruction updates (system prompts, custom instructions) apply the next time you send a message in your current task. File updates (knowledge base files, project resources) only take effect in new tasks created after the update. All previously created tasks remain unaffected and will continue to use the configuration that existed when they were created. Any new tasks started after the update will follow the new project configuration.
  </Accordion>

  <Accordion title="Can I move an existing task into a project?">
    Yes you can, you can think of projects as "folders"
  </Accordion>

  <Accordion title="Is there a limit to the number of projects I can create?">
    There is no limit to the number of projects you can create. You can create as many as you need to organize your work.
  </Accordion>
</AccordionGroup>