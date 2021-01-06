import assert from 'assert';
import feathers from '../../src';

describe('`finally` hooks', () => {
  it('runs after `after` hooks, app level last', async () => {
    const app = feathers().use('/dummy', {
      async get (id: any) {
        return { id };
      }
    });

    app.hooks({
      finally (hook: any) {
        hook.result.chain.push('app finally');
      }
    });

    const service = app.service('dummy');

    service.hooks({
      finally (hook: any) {
        hook.result.chain.push('service finally');
      },
      after (hook: any) {
        hook.result.chain = [ 'service after' ];
      }
    });

    const data = await service.get(42);

    assert.deepStrictEqual(data, {
      id: 42,
      chain: [ 'service after', 'service finally', 'app finally' ]
    });
  });

  it('runs after `error` hooks, app level last', async () => {
    const app = feathers().use('/dummy', {
      get (id: any) {
        throw new Error(`${id} is not the answer`);
      }
    });

    app.hooks({
      finally (hook: any) {
        hook.error.chain.push('app finally');
      }
    });

    const service = app.service('dummy');

    service.hooks({
      finally (hook: any) {
        hook.error.chain.push('service finally');
      }
    });

    service.hooks({
      error (hook: any) {
        hook.error.chain = [ 'service error' ];
      }
    });

    await assert.rejects(() => service.get(42), {
      message: '42 is not the answer',
      chain: [
        'service error',
        'service finally',
        'app finally'
      ]
    });
  });

  it('runs once, sets error if throws', async () => {
    const app = feathers().use('/dummy', {
      async get (id: any) {
        return { id };
      }
    });
    const service = app.service('dummy');

    let count = 0;

    service.hooks({
      error () {
        assert.fail('Should never get here (error hook)');
      },
      finally: [
        function () {
          assert.strictEqual(++count, 1, 'This should be called only once');
          throw new Error('This did not work');
        },
        function () {
          assert.fail('Should never get here (second finally hook)');
        }
      ]
    });

    await assert.rejects(() => service.get(42), {
      message: 'This did not work'
    });
  });
});
