import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'config.dart';

void main() => runApp(const ResQVisionApp());
const green = Color(0xFF173B2E), lime = Color(0xFFC7EF70);

class ResQVisionApp extends StatelessWidget {
  const ResQVisionApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
      title: 'ResQVision',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: green),
          scaffoldBackgroundColor: const Color(0xFFF6F8F3),
          useMaterial3: true),
      home: const Gate());
}

class Gate extends StatefulWidget {
  const Gate({super.key});
  @override
  State<Gate> createState() => _GateState();
}

class _GateState extends State<Gate> {
  String? token;
  String name = '';
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final p = await SharedPreferences.getInstance();
    setState(() {
      token = p.getString('token');
      name = p.getString('name') ?? 'Friend';
    });
  }

  @override
  Widget build(BuildContext context) => token == null
      ? Login(onLogin: (t, n) async {
          final p = await SharedPreferences.getInstance();
          await p.setString('token', t);
          await p.setString('name', n);
          setState(() {
            token = t;
            name = n;
          });
        })
      : Home(
          token: token!,
          name: name,
          onLogout: () async {
            final p = await SharedPreferences.getInstance();
            await p.clear();
            setState(() => token = null);
          });
}

class Login extends StatefulWidget {
  final Function(String, String) onLogin;
  const Login({super.key, required this.onLogin});
  @override
  State<Login> createState() => _LoginState();
}

class _LoginState extends State<Login> {
  final email = TextEditingController(),
      password = TextEditingController(),
      name = TextEditingController();
  bool register = false, busy = false;
  String error = '';
  Future<void> submit() async {
    setState(() => busy = true);
    try {
      final r = await http.post(
          Uri.parse('$apiBaseUrl/auth/${register ? 'register' : 'login'}'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'name': name.text,
            'email': email.text.trim(),
            'password': password.text
          }));
      final d = jsonDecode(r.body);
      if (r.statusCode >= 400) {
        throw Exception(d['message'] ?? 'Authentication failed');
      }
      await widget.onLogin(d['token'], d['user']['name']);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: Center(
          child: SingleChildScrollView(
              padding: const EdgeInsets.all(26),
              child: Card(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Icon(Icons.pets, size: 48, color: green),
                            const Text('ResQVision',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                    color: green)),
                            const Text('Technology with a heart',
                                textAlign: TextAlign.center),
                            const SizedBox(height: 24),
                            if (register)
                              TextField(
                                  controller: name,
                                  decoration: const InputDecoration(
                                      labelText: 'Full name')),
                            TextField(
                                controller: email,
                                decoration:
                                    const InputDecoration(labelText: 'Email')),
                            TextField(
                                controller: password,
                                obscureText: true,
                                decoration: const InputDecoration(
                                    labelText: 'Password (8+ characters)')),
                            if (error.isNotEmpty)
                              Text(error,
                                  style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 18),
                            FilledButton(
                                onPressed: busy ? null : submit,
                                child: Text(busy
                                    ? 'Please wait…'
                                    : register
                                        ? 'Create account'
                                        : 'Sign in')),
                            TextButton(
                                onPressed: () =>
                                    setState(() => register = !register),
                                child: Text(register
                                    ? 'Already registered? Sign in'
                                    : 'New here? Create account'))
                          ]))))));
}

class Home extends StatefulWidget {
  final String token, name;
  final VoidCallback onLogout;
  const Home(
      {super.key,
      required this.token,
      required this.name,
      required this.onLogout});
  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  List reports = [];
  bool loading = false;
  String message = '';
  String hotline = '';
  Map<String, String> get headers =>
      {'Authorization': 'Bearer ${widget.token}'};
  Future<void> load() async {
    setState(() => loading = true);
    try {
      final r =
          await http.get(Uri.parse('$apiBaseUrl/reports'), headers: headers);
      final d = jsonDecode(r.body);
      if (r.statusCode >= 400) throw Exception(d['message']);
      setState(() => reports = d['reports']);
    } catch (e) {
      setState(() => message = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    load();
    _loadHotline();
  }

  Future<void> _loadHotline() async {
    final p = await SharedPreferences.getInstance();
    setState(() => hotline = p.getString('rescue_hotline') ?? '');
  }

  Future<void> _settings() async {
    final c = TextEditingController(text: hotline);
    await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
                title: const Text('Rescue settings'),
                content: TextField(
                    controller: c,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Verified local rescue phone number')),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () async {
                        final p = await SharedPreferences.getInstance();
                        await p.setString('rescue_hotline', c.text.trim());
                        setState(() => hotline = c.text.trim());
                        if (ctx.mounted) Navigator.pop(ctx);
                      },
                      child: const Text('Save'))
                ]));
  }

  Future<void> _callRescue() async {
    if (hotline.isEmpty) {
      await _settings();
      return;
    }
    final uri = Uri(scheme: 'tel', path: hotline);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      setState(() =>
          message = 'Could not open phone dialler. Call $hotline manually.');
    }
  }

  Future<void> createReport() async {
    final description = TextEditingController();
    final location = TextEditingController();
    String animal = 'Dog';
    XFile? photo;
    bool emergency = false;
    Position? gps;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, refresh) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 22,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Report an animal',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                DropdownButtonFormField<String>(
                  initialValue: animal,
                  items: ['Dog', 'Cat', 'Bird', 'Cow', 'Other']
                      .map((type) =>
                          DropdownMenuItem(value: type, child: Text(type)))
                      .toList(),
                  onChanged: (value) => animal = value!,
                ),
                TextField(
                  controller: location,
                  decoration:
                      const InputDecoration(labelText: 'Location / landmark'),
                ),
                TextField(
                  controller: description,
                  maxLines: 3,
                  decoration:
                      const InputDecoration(labelText: 'What did you observe?'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: () async {
                    photo = await ImagePicker().pickImage(
                      source: ImageSource.camera,
                      imageQuality: 78,
                    );
                    refresh(() {});
                  },
                  icon: const Icon(Icons.camera_alt),
                  label: Text(photo == null
                      ? 'Capture photo with camera'
                      : 'Photo captured'),
                ),
                OutlinedButton.icon(
                  onPressed: () async {
                    try {
                      final permission = await Geolocator.requestPermission();
                      if (permission == LocationPermission.denied ||
                          permission == LocationPermission.deniedForever) {
                        throw Exception('Location permission not granted');
                      }
                      gps = await Geolocator.getCurrentPosition();
                      location.text = '${gps!.latitude}, ${gps!.longitude}';
                    } catch (error) {
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(content: Text(error.toString())),
                        );
                      }
                    }
                  },
                  icon: const Icon(Icons.my_location),
                  label: const Text('Use current location'),
                ),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: emergency,
                  onChanged: (value) =>
                      refresh(() => emergency = value ?? false),
                  title: const Text(
                    'Immediate emergency — request urgent rescue',
                    style: TextStyle(fontSize: 12, color: Colors.red),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () async {
                    if (description.text.trim().isEmpty) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(
                            content: Text('Please describe what you observed')),
                      );
                      return;
                    }
                    Navigator.pop(ctx);
                    await sendReport(
                      animal,
                      description.text,
                      location.text,
                      photo,
                      emergency,
                      gps,
                    );
                  },
                  child: const Text('Submit report'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> sendReport(String animal, String desc, String loc, XFile? photo,
      bool emergency, Position? gps) async {
    try {
      final req =
          http.MultipartRequest('POST', Uri.parse('$apiBaseUrl/reports'))
            ..headers.addAll(headers)
            ..fields.addAll({
              'animalType': animal,
              'description': desc,
              'location': loc,
              'priority': emergency ? 'emergency' : 'normal',
              'emergency': emergency.toString(),
              if (gps != null) ...{
                'lat': gps.latitude.toString(),
                'lng': gps.longitude.toString()
              }
            });
      if (photo != null) {
        req.files.add(http.MultipartFile.fromBytes(
            'image', await photo.readAsBytes(),
            filename: photo.name));
      }
      final response = await req.send();
      final body = await response.stream.bytesToString();
      if (response.statusCode >= 400) {
        throw Exception(jsonDecode(body)['message']);
      }
      final data = jsonDecode(body);
      setState(() => message = emergency
          ? 'Emergency report saved. Call the rescue contact now; the app does not auto-dispatch responders.'
          : 'Report submitted successfully');
      final aid = data['firstAid'];
      if (aid != null && mounted) {
        showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
                    title: Text(aid['title'] ?? 'First-response guidance'),
                    content: SingleChildScrollView(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                          ...(aid['steps'] as List).map((x) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text('• $x'))),
                          Text(aid['disclaimer'] ?? '',
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey))
                        ])),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Close'))
                    ]));
      }
      load();
      if (emergency && hotline.isNotEmpty) _callRescue();
    } catch (e) {
      setState(() => message = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(
          title: const Text('ResQVision',
              style: TextStyle(fontWeight: FontWeight.bold, color: green)),
          actions: [
            IconButton(onPressed: _settings, icon: const Icon(Icons.settings)),
            IconButton(
                onPressed: _callRescue,
                icon: const Icon(Icons.call, color: Colors.red)),
            IconButton(
                onPressed: widget.onLogout, icon: const Icon(Icons.logout))
          ]),
      floatingActionButton: FloatingActionButton.extended(
          onPressed: createReport,
          backgroundColor: lime,
          foregroundColor: green,
          icon: const Icon(Icons.add),
          label: const Text('Report animal')),
      body: RefreshIndicator(
          onRefresh: load,
          child: ListView(padding: const EdgeInsets.all(18), children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                  color: green, borderRadius: BorderRadius.circular(18)),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Hello, ${widget.name}',
                        style: const TextStyle(color: lime, fontSize: 13)),
                    const SizedBox(height: 8),
                    const Text('Every life deserves a second chance.',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 23,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text(
                        'Report an animal in need and help connect them with care.',
                        style: TextStyle(color: Colors.white70))
                  ]),
            ),
            if (message.isNotEmpty)
              Padding(padding: const EdgeInsets.all(10), child: Text(message)),
            const Padding(
                padding: EdgeInsets.only(top: 25, bottom: 8),
                child: Text('Your rescue reports',
                    style:
                        TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
            if (loading) const Center(child: CircularProgressIndicator()),
            ...reports.map((r) => Card(
                child: ListTile(
                    leading: const CircleAvatar(
                        backgroundColor: Color(0xFFE8F1E4),
                        child: Icon(Icons.pets, color: green)),
                    title: Text('${r['animalType']} · ${r['status']}'),
                    subtitle: Text('${r['description']}\n${r['location']}'),
                    isThreeLine: true,
                    trailing: IconButton(
                        icon: const Icon(Icons.map_outlined),
                        onPressed: () {
                          final c = r['coordinates'];
                          final q = c != null
                              ? '${c['lat']},${c['lng']}'
                              : (r['location'] ?? '');
                          launchUrl(
                              Uri.parse(
                                  'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(q)}'),
                              mode: LaunchMode.externalApplication);
                        })))),
            if (!loading && reports.isEmpty)
              const Padding(
                  padding: EdgeInsets.all(30),
                  child: Text(
                      'No reports yet. Tap “Report animal” to get started.',
                      textAlign: TextAlign.center))
          ])));
}
