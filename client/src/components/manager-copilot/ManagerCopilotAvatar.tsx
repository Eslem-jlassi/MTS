import React, { useState } from "react";
import { Bot } from "lucide-react";
import { MANAGER_COPILOT_FULL_LABEL } from "./managerCopilotUi";

interface ManagerCopilotAvatarProps {
  className?: string;
  alt?: string;
}

const MANAGER_COPILOT_AVATAR_URL = `${process.env.PUBLIC_URL || ""}/manager-ai-bot.png`;

const ManagerCopilotAvatar: React.FC<ManagerCopilotAvatarProps> = ({
  className = "",
  alt = MANAGER_COPILOT_FULL_LABEL,
}) => {
  const [hasError, setHasError] = useState(false);
  const imageUrl = MANAGER_COPILOT_AVATAR_URL.trim();

  if (imageUrl && !hasError) {
    return (
      <span className={`manager-copilot-avatar ${className}`.trim()}>
        <img
          src={imageUrl}
          alt={alt}
          className="manager-copilot-avatar-image"
          onError={() => setHasError(true)}
        />
      </span>
    );
  }

  return (
    <span className={`manager-copilot-avatar manager-copilot-avatar-fallback ${className}`.trim()}>
      <Bot size={18} />
    </span>
  );
};

export default ManagerCopilotAvatar;
