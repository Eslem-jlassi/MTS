import React, { useMemo, useState } from "react";

interface ChatbotMascotProps {
  className?: string;
  imageUrl?: string;
  alt?: string;
  decorative?: boolean;
}

const ChatbotMascot: React.FC<ChatbotMascotProps> = ({
  className = "",
  imageUrl,
  alt = "Chatbot mascot",
  decorative = true,
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const resolvedImageUrl = useMemo(() => (imageUrl || "").trim(), [imageUrl]);
  const canRenderImage = Boolean(resolvedImageUrl) && !hasImageError;

  if (canRenderImage) {
    return (
      <span className={`chatbot-mascot ${className}`.trim()} aria-hidden={decorative}>
        <img
          src={resolvedImageUrl}
          alt={decorative ? "" : alt}
          className="chatbot-mascot-image"
          onError={() => setHasImageError(true)}
        />
      </span>
    );
  }

  return (
    <span className={`chatbot-mascot ${className}`.trim()} aria-hidden={decorative}>
      <span className="chatbot-mascot-shell">
        <span className="chatbot-mascot-antenna" />
        <span className="chatbot-mascot-head">
          <span className="chatbot-mascot-visor">
            <span className="chatbot-mascot-eye chatbot-mascot-eye-left" />
            <span className="chatbot-mascot-eye chatbot-mascot-eye-right" />
            <span className="chatbot-mascot-smile" />
          </span>
        </span>
        <span className="chatbot-mascot-body">
          <span className="chatbot-mascot-arm chatbot-mascot-arm-left" />
          <span className="chatbot-mascot-core" />
          <span className="chatbot-mascot-arm chatbot-mascot-arm-right" />
        </span>
      </span>
    </span>
  );
};

export default ChatbotMascot;
