# Storage Connections

A storage connection is one place documents can live — your Microsoft 365, a Google Drive, an
object-storage bucket, or the platform's own storage. You can register as many as you need, and each
task or form field decides which one its files go to.

---

## Before you start

Two things are the same for every provider.

**The code.** Every connection has a short code — `acme-sharepoint`, `ops-drive` — and that is what
diagrams and forms cite. Lowercase letters, digits, `-` and `_`. It **cannot be changed later**:
stored files carry it, so renaming would orphan them. The display name is free to change any time.

**Credentials live in Secrets.** A connection never holds a password, key or secret directly. You
save the value under **Settings → Secrets** and the connection references it as `secrets.KEY`.
Saving a literal value is rejected.

---

## Google Drive

Process Linker uses the **Google Drive API** with a service account — an app identity that works
without anyone being signed in, because files are written by background jobs at any hour.

### 1. Create the service account

1. Open the [Google Cloud Console](https://console.cloud.google.com) and select or create a project.
2. **APIs & Services → Library** → search for **Google Drive API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
4. Give it a name (`process-linker`), then **Create and continue**. No project roles are needed —
   access to files comes from sharing the drive in step 3, not from IAM.
5. **Done**.

### 2. Download the JSON key

1. Open the service account you just created → **Keys** tab.
2. **Add key → Create new key → JSON** → **Create**. A `.json` file downloads.
3. In Process Linker, go to **Settings → Secrets** and create a secret — for example
   `GDRIVE_SA_JSON` — and paste **the entire file contents** as the value, braces and all.
4. Delete the downloaded file. It is a private key and it is valid for years.

The service account's email address is inside that file as `client_email`, and looks like
`process-linker@your-project.iam.gserviceaccount.com`. You need it for the next step.

### 3. Give the service account somewhere to write

The key proves *who* the app is; it grants access to nothing. A service account starts with an
empty Drive and no reach into yours, so you have to point it at something — and **which** something
matters more than it looks.

#### Option A — a shared drive (recommended)

Needs Google Workspace. Files in a shared drive are owned by the drive itself, not by whoever
created them, so the app can write freely.

1. Google Drive → **Shared drives** → create one, e.g. *Client Documents*.
2. Open it → **Manage members**.
3. Paste the service account's email (`client_email` from the JSON key, ending in
   `.iam.gserviceaccount.com`).
4. Role: **Content manager** → **Send**. Untick the notification — a service account has no inbox.
5. Copy the drive's ID from the address bar and put it in **Shared drive ID**.

#### Option B — your own folder, written as you

Use this when the files must live in a normal My Drive folder, including on a personal Google
account with no shared drives.

Sharing the folder with the service account is **not enough on its own**: the app would own anything
it creates there, and service accounts have no storage quota, so every upload fails with
*"The user's Drive storage quota has been exceeded"* even though the folder is empty and yours is
nowhere near full.

The fix is to have the app write **as you** — domain-wide delegation, see below — so the files are
owned by your account and count against your quota. That needs Google Workspace; a super-admin
authorizes it once.

#### Sharing a normal folder, either way

1. In Google Drive, right-click the folder → **Share**.
2. Paste the service account's email address.
3. Role: **Editor**. Untick **Notify people**.
4. **Share**, then copy the folder ID from the address bar into **Root folder ID**.

> **On a personal Gmail account with no Workspace**, neither option is available: there are no shared
> drives and no domain-wide delegation. Use Microsoft 365 or object storage for that tenant.

### 4. Find the drive and folder IDs

Both come out of the address bar.

**Shared drive ID** — open the shared drive itself (**Shared drives** → click it):

```
https://drive.google.com/drive/u/0/folders/0AKxYz9_aBcDeUk9PVA
                                           └──── shared drive ID ────┘
```

Shared-drive IDs start with `0A`. That id is also the drive's own root folder.

**Root folder ID** — open the folder inside it that everything should be written under:

```
https://drive.google.com/drive/folders/1a2B3cD4eF5gH6iJ7kL8mN
                                       └──── root folder ID ───┘
```

Folder IDs start with `1`. Leave it empty to write at the top of the shared drive.

Either field also accepts the whole URL — it is trimmed down to the id for you.

### 5. Fill in the connection

| Field | Value |
|---|---|
| Service account key | `secrets.GDRIVE_SA_JSON` — the secret from step 2 |
| Shared drive ID | The shared drive, if you are using one |
| Root folder ID | The folder everything is written inside — empty means the top of the shared drive |
| Impersonate user | Leave empty unless you need the step below |

> **Leave nothing to the service account's own Drive.** It has no usable storage of its own, so a
> connection pointed at nothing has nowhere to put files.

### Writing as a real user (domain-wide delegation)

Required for Option B above, and worth it whenever documents must be **owned** by a person — for
their storage quota, retention policy or eDiscovery. Fill in **Impersonate user** with that person's
address. A Google Workspace super-admin authorizes it once:

1. **Admin console → Security → Access and data control → API controls → Domain-wide delegation**.
2. **Add new**, paste the service account's **Client ID** (the `client_id` field in the JSON key).
3. Scope: `https://www.googleapis.com/auth/drive` → **Authorize**.

---

## Microsoft 365

Documents are written to a SharePoint document library or a OneDrive drive in your own tenant,
through Microsoft Graph.

### 1. Register the application

1. **Entra admin center → App registrations → New registration**. Name it, leave the redirect URI
   empty, register.
2. Copy the **Application (client) ID** and the **Directory (tenant) ID** from the overview page.
3. **Certificates & secrets → New client secret**. Copy the **value** immediately — it is shown once.
4. Save that value under **Settings → Secrets**, e.g. `M365_CLIENT_SECRET`.

### 2. Grant access to one site

1. **API permissions → Add a permission → Microsoft Graph → Application permissions** →
   **Sites.Selected** → add, then **Grant admin consent**.
2. Have a SharePoint administrator grant this app **write** access to the one target site.

`Sites.Selected` limits the app to a single site. `Files.ReadWrite.All` also works but hands over
every site in the tenant — ask for the narrow one.

### 3. Fill in the connection

| Field | Value |
|---|---|
| Directory (tenant) ID | From step 1 |
| Application (client) ID | From step 1 |
| Client secret | `secrets.M365_CLIENT_SECRET` |
| Drive ID | The target document library's drive id |
| Root folder | Folder inside the library that holds everything, e.g. `ProcessLinker` |
| Site URL / Library | Reference only — they make the row readable later |

To find the drive id, call Graph as the app:
`GET /sites/{hostname}:/sites/{site-name}` for the site id, then `GET /sites/{site-id}/drives` and
take the `id` of the library you want.

---

## Object storage (S3 / Cloudflare R2)

Leave **Account ID** and **Bucket** empty to use the platform's own storage — there is nothing else
to configure, and that is what every tenant starts with.

To use a bucket you own:

1. In the Cloudflare dashboard, open **R2** and copy your **Account ID**.
2. **Manage R2 API Tokens → Create API token**, with object read and write on the bucket.
3. Save the **Access Key ID** and **Secret Access Key** as two entries under **Settings → Secrets**.
4. Fill in the account id, bucket, both `secrets.KEY` references, and optionally a root folder
   (defaults to `files`).

---

## Testing and health

**Test connection** writes a small file, reads it back and deletes it. It runs automatically when
you save — a connection that fails the test is not saved, so a broken one can never become the
target of a live process.

After that, every connection is probed **twice a day**: it authenticates and reads the target
folder, without writing anything. The list shows OK or Failing with the provider's own error, and
**Check now** runs the probe on demand.

A failing connection is never quietly swapped for another one. Uploads aimed at it fail and stay
visible, because silently moving a client's documents somewhere else would be worse.

---

## Choosing where a file goes

Most specific wins:

1. **A form field** — a file, multiple-files or document-list field with its **Storage connection**
   property set.
2. **A task** — a `storageTarget` extension property on the task in the modeler.
3. **The process** — the same property on the process itself.
4. **The tenant default** — the connection marked *Default* in the list.

Anything that is empty, or names a connection that no longer exists or has been archived, falls
through to the next level and is recorded in the process log.

`storageTarget` and the form property both take a connection **code**, and both accept FEEL, so a
target can come from a variable: `= "client-" + client.storageCode`.

Where a file lands *inside* a connection is separate — that is `storageFolder`, set on the process.

---

## Archiving and deleting

**Archive** retires a connection: new files stop going to it and it is no longer health-checked, but
everything already stored there keeps working, because a stored file names the connection it came
from. **Reactivate** re-tests it and lets writes resume.

**Delete** is refused while the connection still holds any document. Archive is the way to retire a
storage you cannot delete.

The tenant default can be neither archived nor deleted — make another connection the default first.
