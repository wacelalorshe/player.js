import test from 'ava';
import sinon from 'sinon';
import html from './helpers/html';
import { initializeScreenfull } from '../src/lib/screenfull';

test('initializeScreenfull', (t) => {
    document.requestFullscreen = async () => {
        const event = new window.CustomEvent('fullscreenchange');
        document.dispatchEvent(event);
        document.fullscreenElement = document;
    }
    document.exitFullscreen = async () => {
        const event = new window.CustomEvent('fullscreenchange');
        document.dispatchEvent(event);
        document.fullscreenElement = null;
    }
    document.fullscreenElement = null;

    const screenfull = initializeScreenfull();

    t.is(typeof screenfull, 'object');
    t.is(screenfull.isFullscreen, false);
    t.is(screenfull.element, null);
    t.is(screenfull.isEnabled, false);

    const spy = sinon.spy();
    t.is(screenfull.on('fullscreenchange', spy), undefined);
    t.true(screenfull.request(document) instanceof Promise);
    t.true(spy.calledOnce);
    t.true(screenfull.exit() instanceof Promise);
    t.true(spy.calledTwice);
    t.is(screenfull.off('fullscreenchange', spy), undefined);
});
