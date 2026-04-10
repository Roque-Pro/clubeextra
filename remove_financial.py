#!/usr/bin/env python3
import re

with open('src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove a seção financeiro entre os marcadores
start = content.find('{/* SEÇÃO FINANCEIRO MOVIDA PARA PÁGINA INDEPENDENTE */}')
end = content.find('{/* SEÇÃO COMISSÕES DE VENDEDORES */}', start)

if start != -1 and end != -1:
    new_content = content[:start] + '\n                    ' + content[end:]
    
    with open('src/pages/AdminPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('✓ Seção financeiro removida com sucesso!')
else:
    print('✗ Não foi encontrado os marcadores da seção')
