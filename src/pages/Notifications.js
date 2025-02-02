import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux"
import Note from "../element/Note";
import NoteReaction from "../element/NoteReaction";
import useSubscription from "../feed/Subscription";
import Event from "../nostr/Event";
import EventKind from "../nostr/EventKind";
import { Subscriptions } from "../nostr/Subscriptions";
import { markNotificationsRead } from "../state/Login";

export default function NotificationsPage() {
    const dispatch = useDispatch();
    const notifications = useSelector(s => s.login.notifications);

    useEffect(() => {
        dispatch(markNotificationsRead());
    }, []);

    const etagged = useMemo(() => {
        return notifications?.filter(a => a.kind === EventKind.Reaction)
            .map(a => {
                let ev = Event.FromObject(a);
                let thread = ev.GetThread();
                return thread?.ReplyTo?.Event ?? thread?.Root?.Event;
            })
    }, [notifications]);

    const subEvents = useMemo(() => {
        let sub = new Subscriptions();
        sub.Id = `reactions:${sub.Id}`;
        sub.Kinds.add(EventKind.Reaction);
        sub.ETags = new Set(notifications?.filter(b => b.kind === EventKind.TextNote).map(b => b.id));

        if (etagged.length > 0) {
            let reactionsTo = new Subscriptions();
            reactionsTo.Kinds.add(EventKind.TextNote);
            reactionsTo.Ids = new Set(etagged);
            sub.OrSubs.push(reactionsTo);
        }
        return sub;
    }, [etagged]);

    const otherNotes = useSubscription(subEvents, { leaveOpen: true });

    const sorted = [
        ...notifications
    ].sort((a, b) => b.created_at - a.created_at);

    return (
        <>
            {sorted?.map(a => {
                if (a.kind === EventKind.TextNote) {
                    let reactions = otherNotes?.notes?.filter(c => c.tags.find(b => b[0] === "e" && b[1] === a.id));
                    return <Note data={a} key={a.id} reactions={reactions} />
                } else if (a.kind === EventKind.Reaction) {
                    let ev = Event.FromObject(a);
                    let thread = ev.GetThread();
                    let reactedTo = thread?.ReplyTo?.Event ?? thread?.Root?.Event;
                    let reactedNote = otherNotes?.notes?.find(c => c.id === reactedTo);
                    return <NoteReaction data={a} key={a.id} root={reactedNote} />
                }
                return null;
            })}
        </>
    )
}