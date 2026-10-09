"use client";

import { useEditor, EditorContent, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Undo2, Redo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function RichTextEditor({
  value,
  onChange,
  disabled = false
}: {
  value: JSONContent;
  onChange: (document: JSONContent, text: string) => void;
  disabled?: boolean;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ["https", "http", "mailto"] }
      }),
      Placeholder.configure({ placeholder: "Напишите текст или запустите AI-генерацию…" })
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "min-h-64 px-5 py-4 outline-none [&_p]:my-2 [&_h2]:mt-4 [&_h2]:text-lg [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        role: "textbox",
        "aria-label": "Текст отклика",
        "aria-multiline": "true"
      }
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getJSON(), current.getText())
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false
    })
  });
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap gap-1 border-b bg-muted/30 p-2">
        <Button
          type="button"
          variant={state?.bold ? "secondary" : "ghost"}
          size="icon"
          disabled={!editor || disabled}
          aria-label="Жирный"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant={state?.italic ? "secondary" : "ghost"}
          size="icon"
          disabled={!editor || disabled}
          aria-label="Курсив"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!editor || disabled}
          aria-label="Список"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!editor || disabled}
          aria-label="Нумерованный список"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!editor || disabled}
          aria-label="Отменить"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!editor || disabled}
          aria-label="Повторить"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
