import { useState } from 'react';
import type { SettingsUpdate, SettingsView } from '../core/types.ts';

export function Settings(props: {
  settings: SettingsView;
  preview: boolean;
  onClose: () => void;
  onSave: (input: SettingsUpdate) => Promise<string | null>;
  onPickFolder: () => Promise<string | null>;
  onShowData: () => Promise<void>;
  onClearHistory: () => Promise<void>;
}) {
  const [model, setModel] = useState(props.settings.openaiModel);
  const [apiKey, setApiKey] = useState('');
  const [replaceKey, setReplaceKey] = useState(!props.settings.hasKey);
  const [folders, setFolders] = useState(props.settings.watchFolders);
  const [draft, setDraft] = useState('');
  const [openAtLogin, setOpenAtLogin] = useState(props.settings.openAtLogin);
  const [paused, setPaused] = useState(props.settings.paused);
  const [error, setError] = useState('');
  const [confirmErase, setConfirmErase] = useState(false);

  async function addFolder(folder: string) {
    const next = folder.trim();
    if (!next || folders.includes(next)) return;
    setFolders([...folders, next]);
    setDraft('');
  }

  return (
    <div className="backdrop" onMouseDown={props.onClose}>
      <form
        className="settings"
        role="dialog"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          const message = await props.onSave({
            openaiModel: model,
            openaiApiKey: apiKey,
            replaceKey: replaceKey && apiKey.trim().length > 0,
            watchFolders: folders,
            openAtLogin,
            paused,
          });
          setError(message ?? '');
          if (!message) props.onClose();
        }}
      >
        <div className="card-head">
          <h2 id="settings-title">Settings</h2>
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </div>
        <label>
          OpenAI model
          <input value={model} onChange={(event) => setModel(event.target.value)} spellCheck={false} />
        </label>
        <label>
          API key
          <input
            type="password"
            value={apiKey}
            placeholder={props.settings.hasKey ? 'A key is saved on this computer' : 'sk-…'}
            onChange={(event) => {
              setApiKey(event.target.value);
              setReplaceKey(true);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <p className="fine">The key stays in Timebot’s local data and is only used when you write a summary.</p>
        {props.settings.hasKey ? (
          <button
            type="button"
            className="texty"
            onClick={() => {
              setReplaceKey(true);
              setApiKey('');
              void props.onSave({
                openaiModel: model,
                openaiApiKey: '',
                replaceKey: true,
                watchFolders: folders,
                openAtLogin,
                paused,
              });
            }}
          >
            Remove saved key
          </button>
        ) : null}

        <h3>Watched folders</h3>
        <p className="fine">Timebot reads text files you save here and stores a local diff. Secret files such as .env are skipped.</p>
        <ul className="folder-list">
          {folders.map((folder) => (
            <li key={folder}>
              <span>{folder}</span>
              <button type="button" onClick={() => setFolders(folders.filter((item) => item !== folder))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="folder-add">
          <input
            value={draft}
            placeholder="~/dev/notes"
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Folder path"
          />
          <button type="button" onClick={() => void addFolder(draft)}>
            Add
          </button>
          <button
            type="button"
            onClick={async () => {
              const picked = await props.onPickFolder();
              if (picked) await addFolder(picked);
            }}
          >
            Browse
          </button>
        </div>

        <label className="check">
          <input type="checkbox" checked={openAtLogin} onChange={(event) => setOpenAtLogin(event.target.checked)} />
          Start at login
        </label>
        <p className="fine">
          {props.settings.packaged
            ? 'Timebot will open in the menu bar when you sign in.'
            : 'This takes effect in the installed app. While developing, quit from the Timebot menu.'}
        </p>
        <label className="check">
          <input type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} />
          Pause tracking
        </label>

        {error ? <p className="error">{error}</p> : null}
        <div className="settings-actions">
          <button type="submit" className="primary">
            Save
          </button>
          <button type="button" onClick={() => void props.onShowData()}>
            {props.preview ? 'Show data location' : 'Open data folder'}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (!confirmErase) {
                setConfirmErase(true);
                return;
              }
              void props.onClearHistory().then(() => props.onClose());
            }}
          >
            {confirmErase ? 'Confirm erase' : 'Erase history'}
          </button>
        </div>
      </form>
    </div>
  );
}
