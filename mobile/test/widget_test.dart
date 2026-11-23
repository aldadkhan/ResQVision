import 'package:flutter_test/flutter_test.dart';
import 'package:resqvision_mobile/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows sign-in screen without a saved session', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const ResQVisionApp());
    await tester.pumpAndSettle();

    expect(find.text('ResQVision'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
