---
mode: agent
---
Tarefa 1: [UI/UX] Implementação da Nova Tela Inicial Unificada
Objetivo: Substituir a tela inicial atual pela nova UI simplificada, conforme o mockup visual fornecido pelo Diretor. O objetivo é criar um ponto de entrada único e intuitivo para todas as formas de geração de receitas.
Requisitos Específicos:
Estrutura Principal: Criar um novo componente, talvez HomeScreen.tsx, que contenha:
O título "O que vamos cozinhar hoje?".
Um subtítulo explicativo.
Um único campo de input de texto (<input type="text">) com um ícone de câmera ao lado.
Um card/botão para "Minha Cozinha".
Uma TabBar fixa na parte inferior da tela com os ícones para "Home", "Receitas Salvas", "Planejamento" e "Configurações".
Lógica do Input Unificado: O campo de texto deve aceitar tanto a digitação de ingredientes quanto o nome de um prato. A lógica de handleManualSubmit deve ser adaptada para lidar com essa entrada unificada.
Ação da Câmera: O clique no ícone da câmera deve abrir a câmera ou seletor de arquivos, permitindo ao usuário fazer o upload de uma ou mais imagens (ingredientes, prato pronto, sobras). A lógica de handleUnifiedImageUpload deve ser acionada a partir daqui.
Centralização do CTA: O botão de ação principal (que pode ser o próprio ícone da câmera ou um novo botão "Gerar") deve estar visualmente centralizado.
Restrições:
A nova UI deve substituir completamente a tela de seleção de modo anterior.
Nota para a IA: O Diretor do Projeto (Lucas) não tem conhecimento de programação. As descrições das mudanças de código devem ser claras e focadas em como replicar o design visual do mockup.
Critério de Sucesso: Exceto pelo campo de inserir manualmente os ingredientes que deve estar centralizado, a tela inicial da aplicação é uma réplica funcional e esteticamente fiel do mockup fornecido, com todas as ações (texto, câmera, links) devidamente conectadas.
