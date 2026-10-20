# Quality Gate para Pull Requests

Este repositório documenta um Quality Gate **consultivo** para Pull Requests: verificação de contratos, evidências de CI e registro de pareceres.

- Projeto independente do Copiloto TI e do laboratório de testes.
- Demonstração de referência com dados fictícios, sem workflow de produção exportado.
- Homologação integrada com PR real ainda pendente.

**Status:** política V1.5 implementada; homologação pendente.

## Segurança

Os exemplos são públicos e deliberadamente **fictícios**. Não adicionar exportações brutas de n8n, segredos, credenciais, IDs internos, dados empresariais, logs ou URLs internas.

## Código de referência

- [Arquitetura e políticas](cases/pr-quality-gate/README.md)
- [Avaliador sintético](cases/pr-quality-gate/evaluate.mjs)
- [Observabilidade sanitizada](cases/pr-quality-gate/observe.mjs)

```bash
node --test cases/pr-quality-gate/*.test.mjs
```

**Importante:** o parecer é consultivo. Os exemplos não se conectam ao GitHub, CI ou n8n operacionais.
