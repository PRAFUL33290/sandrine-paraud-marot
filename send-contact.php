<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// N'autorise que les requêtes envoyées depuis ce site.
$allowedOrigins = ['https://sandrine-paraud-marot.fr', 'https://www.sandrine-paraud-marot.fr'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}

function fail(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

function cleanField(string $value): string
{
    // Retire tout caractère de contrôle (dont retours à la ligne) pour éviter
    // l'injection d'en-têtes SMTP, tout en conservant les accents/UTF-8.
    $value = trim($value);
    return preg_replace('/[\x00-\x1F\x7F]/u', '', $value) ?? '';
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail('Méthode non autorisée.', 405);
}

// Piège à robots : ce champ doit rester vide pour un humain.
if (($_POST['website'] ?? '') !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

$name = cleanField((string) ($_POST['name'] ?? ''));
$email = cleanField((string) ($_POST['email'] ?? ''));
$phone = cleanField((string) ($_POST['phone'] ?? ''));
$subject = cleanField((string) ($_POST['subject'] ?? 'Autre demande'));
$message = trim((string) ($_POST['message'] ?? ''));
$consent = ($_POST['consent'] ?? '') === 'Accepté';

if ($name === '' || $email === '' || $message === '') {
    fail('Merci de renseigner votre nom, votre e-mail et votre message.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('L\'adresse e-mail saisie n\'est pas valide.');
}
if (!$consent) {
    fail('Merci d\'accepter la transmission de vos informations.');
}

$configPath = __DIR__ . '/mail-config.php';
if (!is_file($configPath)) {
    fail('Le formulaire n\'est pas encore configuré. Merci de réessayer plus tard.', 500);
}
$config = require $configPath;

$body = <<<TXT
Nouveau message reçu depuis le formulaire de contact du site.

Nom et prénom : {$name}
E-mail : {$email}
Téléphone : {$phone}
Objet : {$subject}

Message :
{$message}
TXT;

try {
    require_once __DIR__ . '/lib/smtp-mailer.php';
    $mailer = new SmtpMailer($config['smtp_host'], (int) $config['smtp_port'], $config['smtp_user'], $config['smtp_pass']);
    $mailer->send(
        $config['smtp_user'],
        $config['to_name'],
        $config['to_email'],
        $config['to_name'],
        $email,
        'Nouveau message — ' . $subject,
        $body
    );
} catch (Throwable $e) {
    error_log('send-contact.php: ' . $e->getMessage());
    fail('L\'envoi du message a échoué. Merci de réessayer ou de nous appeler directement.', 502);
}

echo json_encode(['ok' => true]);
