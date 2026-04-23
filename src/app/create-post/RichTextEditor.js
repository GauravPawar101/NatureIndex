'use client';

import { useCallback, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';

const Image = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },
});

async function getImageDimensions(file) {
  if (typeof window === 'undefined') return null;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new window.Image();
    const dims = await new Promise((resolve) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = objectUrl;
    });
    return dims;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function ToolbarButton({ onClick, isActive, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        `px-3 py-1.5 rounded-md text-sm font-medium border transition ` +
        (disabled
          ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
          : isActive
            ? 'bg-teal-700 text-white border-teal-700'
            : 'bg-stone-50 text-gray-800 border-gray-200 hover:bg-stone-100')
      }
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({ value, onChange, disabled }) {
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-lg max-w-none focus:outline-none min-h-[240px] px-3 py-2',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editable: !disabled,
    immediatelyRender: false,
  });

  const uploadImage = useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/post-images', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Image upload failed');
      }

      const payload = await res.json();
      if (!payload?.url) throw new Error('Upload did not return a URL');
      return payload.url;
    },
    []
  );

  const onPickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;

      try {
        const dims = await getImageDimensions(file);
        const url = await uploadImage(file);
        editor
          .chain()
          .focus()
          .setImage({
            src: url,
            alt: file.name,
            width: dims?.width || null,
            height: dims?.height || null,
          })
          .run();
      } catch (err) {
        // Let the parent show submit errors; keep editor minimal.
        console.error(err);
      }
    },
    [editor, uploadImage]
  );

  if (!editor) {
    return (
      <div className="bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          Bold
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          Italic
        </ToolbarButton>

        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          H3
        </ToolbarButton>

        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          Bullets
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          Numbered
        </ToolbarButton>

        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          Quote
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
        >
          Code Block
        </ToolbarButton>

        <ToolbarButton disabled={disabled} onClick={onPickImage} isActive={false}>
          Image
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div className="bg-stone-50 border border-gray-200 rounded-lg">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
