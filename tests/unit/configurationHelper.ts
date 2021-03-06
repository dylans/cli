import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import MockModule from '../support/MockModule';
import { join, resolve as pathResolve } from 'path';
const sap = require('sinon-as-promised');
const sinon = new sap(Promise);

let sandbox: any;
let mockModule: MockModule;
let mockPkgDir: any;
let mockFs: any;
let mockPath: any;
let moduleUnderTest: any;
let configurationHelper: any;
let consoleWarnStub: sinon.SinonStub;

const packagePath = join(pathResolve('.'), '/_build/tests/support');
const dojoRcPath = `${packagePath}/.dojorc`;

registerSuite({
	name: 'Configuration Helper',
	'package dir exists': {
		'beforeEach'() {
			sandbox = sinon.sandbox.create();
			mockModule = new MockModule('../../src/configurationHelper');
			mockModule.dependencies([
				'pkg-dir',
				'fs',
				'path',
				dojoRcPath
			]);
			mockPkgDir = mockModule.getMock('pkg-dir');
			mockPkgDir.ctor.sync = sandbox.stub().returns(packagePath);
			mockFs = mockModule.getMock('fs');
			mockFs.existsSync = sinon.stub().returns(true);
			mockFs.readFileSync = sinon.stub().returns('{}');
			mockFs.writeFileSync = sinon.stub();
			mockPath = mockModule.getMock('path');
			mockPath.join = sinon.stub().returns(dojoRcPath);
			moduleUnderTest = mockModule.getModuleUnderTest().default;
			configurationHelper = moduleUnderTest;
		},
		'afterEach'() {
			sandbox.restore();
			mockModule.destroy();
		},
		'Should write new config to file when save called'() {
			const newConfig = { foo: 'bar' };
			mockFs.readFileSync = sinon.stub().returns(JSON.stringify({ testCommandName: {} }));
			configurationHelper.save(newConfig, 'testCommandName');
			assert.isTrue(mockFs.writeFileSync.calledOnce);
			assert.equal(mockFs.writeFileSync.firstCall.args[0], dojoRcPath);
			assert.equal(mockFs.writeFileSync.firstCall.args[1], JSON.stringify({ testCommandName: newConfig }, null, 2));
		},
		'Should merge new config with old when save called'() {
			const newConfig = { foo: 'bar' };
			const existingConfig = { existing: 'config' };
			mockFs.readFileSync.returns(JSON.stringify({ testCommandName: existingConfig }));
			configurationHelper.save(newConfig, 'testCommandName');
			assert.isTrue(mockFs.writeFileSync.calledOnce);
			assert.equal(mockFs.writeFileSync.firstCall.args[1], JSON.stringify({ testCommandName: Object.assign(existingConfig, newConfig) }, null, 2));
		},
		'Should merge new commandNames with existing command config when save called'() {
			const newConfig = { foo: 'bar' };
			const existingConfig = { existing: 'config' };
			mockFs.readFileSync.returns(JSON.stringify({ existingCommandName: existingConfig }));
			configurationHelper.save(newConfig, 'testCommandName');
			assert.isTrue(mockFs.writeFileSync.calledOnce);
			assert.deepEqual(mockFs.writeFileSync.firstCall.args[1], JSON.stringify({
				existingCommandName: existingConfig,
				testCommandName: newConfig
			}, null, 2));
		},
		'Should return undefined config when no dojorc for commandName exists'() {
			mockFs.existsSync.returns(false);
			const config = configurationHelper.get('testCommandName');
			assert.isTrue(mockFs.readFileSync.notCalled);
			assert.deepEqual(config, {});
		},
		'Should return existing config when a dojorc entry exists'() {
			const existingConfig = { existing: 'config' };
			mockFs.readFileSync.returns(JSON.stringify({ testCommandName: existingConfig }));
			const config = configurationHelper.get('testCommandName');
			assert.isTrue(mockFs.readFileSync.calledOnce);
			assert.deepEqual(config, existingConfig);
		}
	},
	'package dir does not exist': {
		'beforeEach'() {
			sandbox = sinon.sandbox.create();
			mockModule = new MockModule('../../src/configurationHelper');
			mockModule.dependencies([
				'pkg-dir',
				'fs',
				'path'
			]);
			mockPkgDir = mockModule.getMock('pkg-dir');
			mockPkgDir.ctor.sync = sandbox.stub().returns(null);
			mockFs = mockModule.getMock('fs');
			mockFs.readFileSync = sandbox.stub();
			mockFs.writeFileSync = sandbox.stub();
			mockPath = mockModule.getMock('path');
			mockPath.join = sandbox.stub();
			consoleWarnStub = sandbox.stub(console, 'warn');
			moduleUnderTest = mockModule.getModuleUnderTest().default;
			configurationHelper = moduleUnderTest;
		},
		'afterEach'() {
			sandbox.restore();
			mockModule.destroy();
		},
		'Should return empty object when pkgdir returns null'() {
			const config = configurationHelper.get('testCommandName');
			assert.isFalse(mockFs.readFileSync.called);
			assert.isFalse(mockPath.join.called);
			assert.deepEqual(config, {});
		},
		'Should warn user when config save called outside of a pkgdir'() {
			configurationHelper.save({}, 'testCommandName');
			assert.isFalse(mockFs.writeFileSync.called);
			assert.isTrue(consoleWarnStub.calledOnce);
		}
	}
});
