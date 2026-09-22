import { useState } from 'react';
import type { SettingsUpdate, SettingsView } from '../core/types.ts';
import { btn, btnDanger, btnPrimary, btnText, cn, fine, heading } from './ui.ts';

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
    <div className="fixed inset-0 z-[5] grid justify-end bg-[rgb(28_22_16/0.35)]" onMouseDown={props.onClose}>
      <form
        className="m-0 h-full w-[min(440px,100vw)] overflow-auto border-l border-line bg-paper px-[22px] pt-[22px] pb-8 shadow-card"
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 id="settings-title" className={heading}>
            Settings
          </h2>
          <button type="button" className={btn} onClick={props.onClose}>
            Close
          </button>
        </div>
        <label className="mt-4 block">
          OpenAI model
          <input
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            spellCheck={false}
          />
        </label>
        <label className="mt-4 block">
          API key
          <input
            className="mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5"
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
        <p className={cn(fine, 'mt-2')}>The key stays in Timebot’s local data and is only used when you write a summary.</p>
        {props.settings.hasKey ? (
          <button
            type="button"
            className={cn(btnText, 'mt-2')}
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

        <h3 className="mt-4 mb-2 font-serif text-lg font-medium">Watched folders</h3>
        <p className={fine}>
          Timebot reads text files you save here and stores a local diff. Secret files such as .env are skipped.
        </p>
        <ul className="m-0 list-none p-0">
          {folders.map((folder) => (
            <li key={folder} className="flex items-center justify-between gap-3 border-t border-line py-2">
              <span className="min-w-0 break-all">{folder}</span>
              <button type="button" className={btn} onClick={() => setFolders(folders.filter((item) => item !== folder))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2.5"
            value={draft}
            placeholder="~/dev/notes"
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Folder path"
          />
          <button type="button" className={btn} onClick={() => void addFolder(draft)}>
            Add
          </button>
          <button
            type="button"
            className={btn}
            onClick={async () => {
              const picked = await props.onPickFolder();
              if (picked) await addFolder(picked);
            }}
          >
            Browse
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2">
          <input
            className="m-0 w-auto"
            type="checkbox"
            checked={openAtLogin}
            onChange={(event) => setOpenAtLogin(event.target.checked)}
          />
          Start at login
        </label>
        <p className={cn(fine, 'mt-2')}>
          {props.settings.packaged
            ? 'Timebot will open in the menu bar when you sign in.'
            : 'This takes effect in the installed app. While developing, quit from the Timebot menu.'}
        </p>
        <label className="mt-4 flex items-center gap-2">
          <input className="m-0 w-auto" type="checkbox" checked={paused} onChange={(event) => setPaused(event.target.checked)} />
          Pause tracking
        </label>

        {error ? <p className="mt-4 text-del">{error}</p> : null}
        <div className="mt-[18px] flex flex-wrap items-center justify-start gap-2">
          <button type="submit" className={btnPrimary}>
            Save
          </button>
          <button type="button" className={btn} onClick={() => void props.onShowData()}>
            {props.preview ? 'Show data location' : 'Open data folder'}
          </button>
          <button
            type="button"
            className={btnDanger}
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
