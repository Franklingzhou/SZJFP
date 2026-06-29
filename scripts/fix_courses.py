import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix truncated string and add missing closing code
old = "'does not exi"
new = ("does not exist')) {\n"
       "        console.error('[courses POST] package_items error:', pkgErr);\n"
       "      }\n"
       "    }\n"
       "\n"
       "    return NextResponse.json({ success: true, ok: true, data });\n"
       "  } catch (error: unknown) {\n"
       "    const message = error instanceof Error ? error.message : '创建失败';\n"
       "    console.error('[courses POST] Error:', message);\n"
       "    return NextResponse.json({ ok: false, error: message }, { status: 500 });\n"
       "  }\n"
       "}")

content = content.replace(old, new)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed courses/route.ts')
