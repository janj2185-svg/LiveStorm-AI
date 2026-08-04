import 'dart:js_interop';
import 'dart:js_interop_unsafe';

@JS('SyloraAether')
extension type _SyloraAether._(JSObject _) implements JSObject {
  external void show();
  external void hide();
  external void enter(JSBoolean create);
}

@JS('SyloraAether')
external _SyloraAether? get _aether;

@JS('location')
extension type _Location._(JSObject _) implements JSObject {
  external set hash(String value);
}

@JS('location')
external _Location get _location;

@JS('globalThis')
external JSObject get _globalThis;

void revealAetherShell() {
  _aether?.show();
}

void hideAetherShell() {
  _aether?.hide();
}

void enterAetherApp({required bool create}) {
  final api = _aether;
  if (api != null) {
    api.enter(create.toJS);
    return;
  }
  _location.hash = create ? '#/auth?create=1' : '#/auth';
}

/// Lets the HTML shell force GoRouter navigation after Flutter boots.
void registerAppNavigator(void Function(String path) go) {
  final app = JSObject();
  app['go'] = ((JSString path) {
    go(path.toDart);
  }).toJS;
  _globalThis['SyloraApp'] = app;
}
