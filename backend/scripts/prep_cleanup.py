import json, re

with open('/tmp/prod_models.json') as f:
    data = json.load(f)

models = data.get('models', data) if isinstance(data, dict) else data

to_delete = [m['id'] for m in models if re.search(r'-\d{13}$', m.get('slug', ''))]
to_keep   = [m['id'] for m in models if not re.search(r'-\d{13}$', m.get('slug', ''))]

print(f'Manter: {len(to_keep)} | Deletar: {len(to_delete)}')

with open('/tmp/ids_to_delete.json', 'w') as f:
    json.dump(to_delete, f)

print('IDs salvos em /tmp/ids_to_delete.json')
