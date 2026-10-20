import { useContext } from "react";
import { ChatRealtimeContext } from "./chat-realtime-provider";

export function useChatSocket() {
  const value = useContext(ChatRealtimeContext);
  if (!value) throw new Error("ChatRealtimeProvider is missing");
  return value;
}
