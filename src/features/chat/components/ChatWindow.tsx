import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import { ChatStatus } from "./ChatStatus";

export function ChatWindow() {
 return (
  <section>
   <ChatMessageList />
   <ChatStatus />
   <ChatInput />
  </section>
 );
}
