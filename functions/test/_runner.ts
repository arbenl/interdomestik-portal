import { register } from 'ts-node';

delete require.cache[require.resolve('ts-node/register')];

delete require.cache[require.resolve('ts-node/register/transpile-only')];

delete require.cache[require.resolve('ts-node/register/type-check')];

register({ transpileOnly: true });

import('./automation.callables.test');
import('./documents.callables.test');
import('./security.test');
import('./user.test');
import('./index.test');
import('./callables.admin.test');
