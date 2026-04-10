with open('src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('{/* SEÇÃO FINANCEIRO MOVIDA')
end = content.find('{/* SEÇÃO COMISSÕES DE VENDEDORES */}', start)

if start != -1 and end != -1:
    new_content = content[:start] + content[end:]
    with open('src/pages/AdminPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('✓ Seção removida')
else:
    print('✗ Não encontrado')
