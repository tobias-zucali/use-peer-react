import { DataConnection } from "peerjs";
import { User } from "./utils";

export type Message = IntroductionMessage | NewParticipantMessage;

type IntroductionProps = {
  user?: User;
  id: string;
}
type IntroductionMessage = IntroductionProps & {
  type: 'introduction';
}

export function sendIntroduction(connection: DataConnection, props: IntroductionProps) {
  const message: IntroductionMessage = {
    type: 'introduction',
    ...props,
  };
  connection.send(message);
}

type NewParticipantMessage = {
  type: 'new participant';
  id: string;
}

export function sendNewParticipant(connection: DataConnection, id: string) {
  const message: NewParticipantMessage = {
    type: 'new participant',
    id,
  };
  connection.send(message);
}
