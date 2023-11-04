import React, { FormEvent, useEffect } from "react";
import ReactDOM from "react-dom/client";

// this example uses the uuid library (`npm install uuid`)
import { v4 as uuidv4 } from "uuid";

// You'll need to configure your build system to make these entrypoints
// available as urls. Vite does this automatically via the `?url` suffix.
import sqlSyncWasmUrl from "@orbitinghail/sqlsync-worker/sqlsync.wasm?url";
import workerUrl from "@orbitinghail/sqlsync-worker/worker.js?url";

// import the SQLSync provider and hooks
import { SQLSyncProvider, sql } from "@orbitinghail/sqlsync-react";
import { useMutate, useQuery } from "./doctype";

// Create a DOC_ID to use, each DOC_ID will correspond to a different SQLite
// database. We use a static doc id so we can play with cross-tab sync.
import { journalIdFromString } from "@orbitinghail/sqlsync-worker";
const DOC_ID = journalIdFromString("VM7fC4gKxa52pbdtrgd9G9");

// Configure the SQLSync provider near the top of the React tree
ReactDOM.createRoot(document.getElementById("root")!).render(
  <SQLSyncProvider wasmUrl={sqlSyncWasmUrl} workerUrl={workerUrl}>
    <App />
  </SQLSyncProvider>
);

// Use SQLSync hooks in your app
export function App() {
  // we will use the standard useState hook to handle the message input box
  const [msg, setMsg] = React.useState("");

  // create a mutate function for our document
  const mutate = useMutate(DOC_ID);

  // initialize the schema; eventually this will be handled by SQLSync automatically
  useEffect(() => {
    mutate({ tag: "InitSchema" }).catch((err) => {
      console.error("Failed to init schema", err);
    });
  }, [mutate]);

  // create a callback which knows how to trigger the add message mutation
  const handleSubmit = React.useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      // Prevent the browser from reloading the page
      e.preventDefault();

      // create a unique message id
      const id = crypto.randomUUID ? crypto.randomUUID() : uuidv4();

      // don't add empty messages
      if (msg.trim() !== "") {
        mutate({ tag: "AddMessage", id, msg }).catch((err) => {
          console.error("Failed to add message", err);
        });
        // clear the message
        setMsg("");
      }
    },
    [mutate, msg]
  );

  // finally, query SQLSync for all the messages, sorted by created_at
  const { rows } = useQuery<{ id: string; msg: string }>(
    DOC_ID,
    sql`
      select id, msg from messages
      order by created_at
    `
  );

  return (
    <div>
      <h1>Guestbook:</h1>
      <ul>
        {(rows ?? []).map(({ id, msg }) => (
          <li key={id}>{msg}</li>
        ))}
      </ul>
      <h3>Leave a message:</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Msg:
          <input
            type="text"
            name="msg"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </label>
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}