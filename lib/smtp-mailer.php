<?php
// Client SMTP minimal (sans dépendance externe) pour l'envoi via un compte
// Hostinger en SSL implicite (port 465) avec authentification AUTH LOGIN.

class SmtpMailerException extends Exception {}

class SmtpMailer
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    /** @var resource|null */
    private $socket;

    public function __construct(string $host, int $port, string $username, string $password)
    {
        $this->host = $host;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }

    public function send(string $fromEmail, string $fromName, string $toEmail, string $toName, string $replyTo, string $subject, string $body): void
    {
        $this->connect();
        $this->expect(220);

        $this->command('EHLO ' . $this->host, 250);
        $this->command('AUTH LOGIN', 334);
        $this->command(base64_encode($this->username), 334);
        $this->command(base64_encode($this->password), 235);

        $this->command('MAIL FROM:<' . $fromEmail . '>', 250);
        $this->command('RCPT TO:<' . $toEmail . '>', 250);
        $this->command('DATA', 354);

        $headers = [
            'Date: ' . date('r'),
            'From: ' . $this->encodeHeader($fromName) . ' <' . $fromEmail . '>',
            'To: ' . $this->encodeHeader($toName) . ' <' . $toEmail . '>',
            'Reply-To: ' . $replyTo,
            'Subject: ' . $this->encodeHeader($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];

        $message = implode("\r\n", $headers) . "\r\n\r\n" . $this->escapeBody($body) . "\r\n.";
        $this->command($message, 250);

        $this->command('QUIT', 221);
        fclose($this->socket);
        $this->socket = null;
    }

    private function connect(): void
    {
        $context = stream_context_create();
        $address = 'ssl://' . $this->host . ':' . $this->port;
        $socket = @stream_socket_client($address, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $context);
        if ($socket === false) {
            throw new SmtpMailerException("Connexion SMTP impossible : $errstr ($errno)");
        }
        $this->socket = $socket;
        stream_set_timeout($this->socket, 15);
    }

    private function command(string $command, int $expectedCode): string
    {
        fwrite($this->socket, $command . "\r\n");
        return $this->expect($expectedCode);
    }

    private function expect(int $expectedCode): string
    {
        $response = '';
        while (($line = fgets($this->socket, 515)) !== false) {
            $response .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        $code = (int) substr($response, 0, 3);
        if ($code !== $expectedCode) {
            throw new SmtpMailerException("Réponse SMTP inattendue ($code attendu $expectedCode) : $response");
        }
        return $response;
    }

    private function encodeHeader(string $value): string
    {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }

    private function escapeBody(string $body): string
    {
        $body = str_replace("\r\n", "\n", $body);
        $body = str_replace("\n", "\r\n", $body);
        // Byte-stuffing : une ligne commençant par un point doit être doublée.
        return preg_replace('/^\./m', '..', $body);
    }
}
