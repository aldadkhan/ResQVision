import 'package:flutter/foundation.dart';

// Android emulator: 10.0.2.2. Physical device: use your computer's LAN IP.
const String apiBaseUrl =
    kIsWeb ? 'http://localhost:5000/api' : 'http://10.0.2.2:5000/api';
