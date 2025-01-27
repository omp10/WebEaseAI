import React, { useContext, useEffect, useRef } from "react";
import { SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { ActionContext } from "@/context/ActionContext";

function SandpackPreviewClient() {
  const previewRef = useRef(null);
  const { sandpack } = useSandpack();
  const { action, setAction } = useContext(ActionContext);

  useEffect(() => {
    if (sandpack && action) {
      GetSandpackClient();
    }
  }, [sandpack, action]);

  const GetSandpackClient = async () => {
    try {
      const client = previewRef.current?.getClient();
      if (client) {
        const result = await client.getCodeSandboxURL();
        if (result) {
          if (action?.actionType === "deploy") {
            window.open(`https://${result.sandboxId}.csb.app`);
          } else if (action?.actionType === "export") {
            window.open(result.editorUrl);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching Sandpack client:", error);
    }
  };

  return (
    <SandpackPreview
      ref={previewRef}
      style={{ height: "80vh" }}
      showNavigator={true}
    />
  );
}

export default SandpackPreviewClient;
