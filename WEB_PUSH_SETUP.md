# Browser push notifications

The backend can deliver push messages to Expo devices and browser subscriptions. Browser push requires a VAPID key pair and an HTTPS site (localhost is allowed for development).

1. From `backend1`, run `npx web-push generate-vapid-keys`.
2. Set `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_VAPID_SUBJECT` on the backend service. Keep the private key server-side.
3. Restart the backend. The authenticated `GET /push-tokens/config` endpoint supplies only the public key to the website when browser push is enabled.
4. Signed-in users can enable or disable browser notifications in Profile → Settings. Notification clicks open the relevant inbox item.

The Profile settings page keeps the inbox available if a browser lacks push support or the deployment has not been configured. Do not reuse a VAPID key pair across unrelated applications.
