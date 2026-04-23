'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Bold, Type, List, ListOrdered } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
}

export default function RichTextEditor({ value, onChange, onBlur }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: true }), Image],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[160px] p-4 bg-slate-50 rounded-b-2xl max-w-none',
      },
    },
    // Avoid hydration mismatch when rendering on SSR
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) {
      editor.commands.setContent(value || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')
      const fileExt = file.name.split('.').pop() || 'webp'
      const fileName = `editor-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/branding/${fileName}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
      const publicUrl = data?.publicUrl
      if (publicUrl && editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run()
        onChange(editor.getHTML())
      }
    } catch (err) {
      console.error('Erro ao enviar imagem do editor:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex gap-1 p-2 bg-white border-b border-slate-100 items-center">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
          aria-label="Negrito"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
          aria-label="Título"
        >
          <Type size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
          aria-label="Lista"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded ${editor?.isActive('orderedList') ? 'bg-slate-100 text-blue-600' : 'text-slate-500'}`}
          aria-label="Lista ordenada"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('URL do link (https://...)') || '';
            if (!url) return;
            editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
          className="p-2 rounded text-slate-500"
          aria-label="Inserir link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click()
          }}
          className="p-2 rounded text-slate-500"
          aria-label="Inserir imagem via upload"
        >
          {uploading ? 'Enviando...' : '🖼️'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <div className="flex-1" />
      </div>

      <EditorContent editor={editor} onBlur={onBlur} />
    </div>
  )
}
