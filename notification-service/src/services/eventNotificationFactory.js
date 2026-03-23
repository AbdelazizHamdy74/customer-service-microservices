const buildEventBase = (topic, payload, overrides = {}) => {
  const sourceService = topic.split(".")[0];
  const happenedAt = payload?.emittedAt ? new Date(payload.emittedAt) : new Date();

  return {
    topic,
    sourceService,
    notificationType: "EVENT",
    channels: ["IN_APP"],
    happenedAt,
    metadata: payload || null,
    ...overrides,
  };
};

const withEntity = (entityType, entityId) => ({
  entity: {
    entityType,
    entityId: entityId || null,
  },
});

const buildSystemNotification = (topic, payload, title, message, category, entity) => [
  buildEventBase(topic, payload, {
    category,
    title,
    message,
    recipient: {
      recipientType: "SYSTEM",
      recipientId: topic,
    },
    ...entity,
  }),
];

const buildNotificationsFromEvent = (topic, payload = {}) => {
  switch (topic) {
    case "auth.login":
      return [
        buildEventBase(topic, payload, {
          category: "AUTH",
          title: "Login Successful",
          message: "Your account logged in successfully.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.userId || null,
            email: payload.email || null,
          },
          ...withEntity("AUTH_USER", payload.userId),
        }),
      ];

    case "auth.logout":
      return [
        buildEventBase(topic, payload, {
          category: "AUTH",
          title: "Logout Successful",
          message: "Your account logged out successfully.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.userId || null,
          },
          ...withEntity("AUTH_USER", payload.userId),
        }),
      ];

    case "auth.forgot-password":
      return [
        buildEventBase(topic, payload, {
          category: "AUTH",
          title: "Password Reset Requested",
          message: "A password reset request was created for your account.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.userId || null,
            email: payload.email || null,
          },
          ...withEntity("AUTH_USER", payload.userId),
        }),
      ];

    case "auth.password-reset":
      return [
        buildEventBase(topic, payload, {
          category: "AUTH",
          title: "Password Reset Successful",
          message: "Your password has been reset successfully.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.userId || null,
            email: payload.email || null,
          },
          ...withEntity("AUTH_USER", payload.userId),
        }),
      ];

    case "customer.invited":
      return [
        buildEventBase(topic, payload, {
          category: "CUSTOMER",
          title: "Customer Invitation Sent",
          message: "Your customer invitation has been created.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.authUserId || null,
            email: payload.email || null,
            displayName: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || null,
          },
          ...withEntity("AUTH_USER", payload.authUserId),
        }),
      ];

    case "customer.provisioned":
      return [
        buildEventBase(topic, payload, {
          category: "CUSTOMER",
          title: "Customer Profile Ready",
          message: "Your customer profile is ready to use.",
          recipient: {
            recipientType: "CUSTOMER",
            recipientId: payload.customerId || null,
          },
          ...withEntity("CUSTOMER", payload.customerId),
        }),
      ];

    case "customer.created":
      return [
        buildEventBase(topic, payload, {
          category: "CUSTOMER",
          title: "Customer Profile Created",
          message: "A customer profile was created in the system.",
          recipient: {
            recipientType: "CUSTOMER",
            recipientId: payload.customerId || null,
          },
          ...withEntity("CUSTOMER", payload.customerId),
        }),
      ];

    case "customer.updated":
      return [
        buildEventBase(topic, payload, {
          category: "CUSTOMER",
          title: "Customer Profile Updated",
          message: "Customer profile information was updated.",
          recipient: {
            recipientType: "CUSTOMER",
            recipientId: payload.customerId || null,
          },
          ...withEntity("CUSTOMER", payload.customerId),
        }),
      ];

    case "customer.deleted":
      return buildSystemNotification(
        topic,
        payload,
        "Customer Profile Deleted",
        "A customer profile was deleted from the system.",
        "CUSTOMER",
        withEntity("CUSTOMER", payload.customerId)
      );

    case "agent.invited":
      return [
        buildEventBase(topic, payload, {
          category: "AGENT",
          title: "Agent Invitation Sent",
          message: "Your agent invitation has been created.",
          recipient: {
            recipientType: "USER",
            recipientId: payload.authUserId || null,
            email: payload.email || null,
            displayName: `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || null,
          },
          ...withEntity("AUTH_USER", payload.authUserId),
        }),
      ];

    case "agent.provisioned":
      return [
        buildEventBase(topic, payload, {
          category: "AGENT",
          title: "Agent Profile Ready",
          message: "Your agent profile is ready to use.",
          recipient: {
            recipientType: "AGENT",
            recipientId: payload.agentId || null,
          },
          ...withEntity("AGENT", payload.agentId),
        }),
      ];

    case "agent.created":
      return [
        buildEventBase(topic, payload, {
          category: "AGENT",
          title: "Agent Profile Created",
          message: "An agent profile was created in the system.",
          recipient: {
            recipientType: "AGENT",
            recipientId: payload.agentId || null,
          },
          ...withEntity("AGENT", payload.agentId),
        }),
      ];

    case "agent.updated":
      return [
        buildEventBase(topic, payload, {
          category: "AGENT",
          title: "Agent Profile Updated",
          message: "Agent profile information was updated.",
          recipient: {
            recipientType: "AGENT",
            recipientId: payload.agentId || null,
          },
          ...withEntity("AGENT", payload.agentId),
        }),
      ];

    case "agent.deleted":
      return buildSystemNotification(
        topic,
        payload,
        "Agent Profile Deleted",
        "An agent profile was deleted from the system.",
        "AGENT",
        withEntity("AGENT", payload.agentId)
      );

    case "agent.role.assigned":
      return [
        buildEventBase(topic, payload, {
          category: "AGENT",
          title: "Agent Role Updated",
          message: `Your role has been updated to ${payload.role || "a new role"}.`,
          recipient: {
            recipientType: "AGENT",
            recipientId: payload.agentId || null,
          },
          ...withEntity("AGENT", payload.agentId),
        }),
      ];

    case "ticket.created": {
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Created",
            message: payload.subject
              ? `Your ticket "${payload.subject}" was created successfully.`
              : "A new ticket was created successfully.",
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "New Ticket Assigned",
            message: payload.subject
              ? `Ticket "${payload.subject}" is now assigned to you.`
              : "A new ticket is now assigned to you.",
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "Ticket Created",
            "A new ticket was created.",
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    case "ticket.updated": {
      const message = payload.subject
        ? `Ticket "${payload.subject}" was updated.`
        : "A ticket was updated.";
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Updated",
            message,
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Updated",
            message,
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "Ticket Updated",
            message,
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    case "ticket.assigned": {
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Assignment Updated",
            message: payload.subject
              ? `Your ticket "${payload.subject}" has a new assigned agent.`
              : "Your ticket has a new assigned agent.",
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Assigned",
            message: payload.subject
              ? `Ticket "${payload.subject}" has been assigned to you.`
              : "A ticket has been assigned to you.",
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.previousAssignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Reassigned",
            message: payload.subject
              ? `Ticket "${payload.subject}" was reassigned to another agent.`
              : "A ticket was reassigned to another agent.",
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.previousAssignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "Ticket Assignment Updated",
            "A ticket assignment was updated.",
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    case "ticket.closed": {
      const message = payload.subject
        ? `Ticket "${payload.subject}" was closed.`
        : "A ticket was closed.";
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Closed",
            message,
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Closed",
            message,
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "Ticket Closed",
            message,
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    case "ticket.reopened": {
      const message = payload.subject
        ? `Ticket "${payload.subject}" was reopened.`
        : "A ticket was reopened.";
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Reopened",
            message,
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "Ticket Reopened",
            message,
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "Ticket Reopened",
            message,
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    case "ticket.commented": {
      const commentPreview = payload.commentPreview ? ` Comment: ${payload.commentPreview}` : "";
      const message = payload.subject
        ? `A new comment was added to ticket "${payload.subject}".${commentPreview}`
        : `A new comment was added to a ticket.${commentPreview}`;
      const notifications = [];
      if (payload.customerId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "New Ticket Comment",
            message,
            recipient: {
              recipientType: "CUSTOMER",
              recipientId: payload.customerId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      if (payload.assignedAgentId) {
        notifications.push(
          buildEventBase(topic, payload, {
            category: "TICKET",
            title: "New Ticket Comment",
            message,
            recipient: {
              recipientType: "AGENT",
              recipientId: payload.assignedAgentId,
            },
            ...withEntity("TICKET", payload.ticketId),
          })
        );
      }
      return notifications.length
        ? notifications
        : buildSystemNotification(
            topic,
            payload,
            "New Ticket Comment",
            message,
            "TICKET",
            withEntity("TICKET", payload.ticketId)
          );
    }

    default:
      return [];
  }
};

module.exports = {
  buildNotificationsFromEvent,
};
