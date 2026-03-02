/**
 * New Checkout Page (Server Component)
 *
 * Dedicated route for creating new checkout configurations.
 * Renders the config editor with no initial config.
 */

import { ConfigEditorClient } from "../components/editor/config-editor-client";

export default function NewCheckoutPage() {
  return <ConfigEditorClient id="new" initialConfig={null} />;
}
