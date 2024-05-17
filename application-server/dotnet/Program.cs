using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;
using System.Security.Cryptography;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

IConfiguration config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddEnvironmentVariables().Build();

// Load env variables
var SERVER_PORT = config.GetValue<int>("SERVER_PORT");
var LIVEKIT_API_KEY = config.GetValue<string>("LIVEKIT_API_KEY");
var LIVEKIT_API_SECRET = config.GetValue<string>("LIVEKIT_API_SECRET");

// Enable CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      builder =>
                      {
                          builder.WithOrigins("*").AllowAnyHeader();
                      });
});

builder.WebHost.UseKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(SERVER_PORT);
});

var app = builder.Build();
app.UseCors(MyAllowSpecificOrigins);

app.MapPost("/token", async (HttpRequest request) =>
{
    var body = new StreamReader(request.Body);
    string postData = await body.ReadToEndAsync();
    Dictionary<string, dynamic> bodyParams = JsonSerializer.Deserialize<Dictionary<string, dynamic>>(postData) ?? new Dictionary<string, dynamic>();

    if (bodyParams.TryGetValue("roomName", out var roomName) && bodyParams.TryGetValue("participantName", out var participantName))
    {
        var token = CreateLiveKitJWT(roomName.ToString(), participantName.ToString());
        return Results.Json(token);
    }
    else
    {
        return Results.BadRequest("\"roomName\" and \"participantName\" are required");
    }
});

app.MapPost("/webhook", async (HttpRequest request) =>
{
    var body = new StreamReader(request.Body);
    string postData = await body.ReadToEndAsync();

    var authHeader = request.Headers["Authorization"];
    if (authHeader.Count == 0)
    {
        return Results.BadRequest("Authorization header is required");
    }
    try
    {
        VerifyWebhookEvent(authHeader.First(), postData);

    }
    catch (Exception e)
    {
        Console.Error.WriteLine("Error validating webhook event: " + e.Message);
        return Results.Unauthorized();
    }

    Console.Out.WriteLine(postData);
    return Results.Ok();
});

string CreateLiveKitJWT(string roomName, string participantName)
{
    JwtHeader headers = new(new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(LIVEKIT_API_SECRET)), "HS256"));

    var videoGrants = new Dictionary<string, object>()
    {
        { "room", roomName },
        { "roomJoin", true }
    };
    JwtPayload payload = new()
    {
        { "exp", new DateTimeOffset(DateTime.UtcNow.AddHours(6)).ToUnixTimeSeconds() },
        { "iss", LIVEKIT_API_KEY },
        { "nbf", 0 },
        { "sub", participantName },
        { "name", participantName },
        { "video", videoGrants }
    };
    JwtSecurityToken token = new(headers, payload);
    return new JwtSecurityTokenHandler().WriteToken(token);
}

void VerifyWebhookEvent(string authHeader, string body)
{
    var utf8Encoding = new UTF8Encoding();
    var algorithm = new HMACSHA256();
    var tokenValidationParameters = new TokenValidationParameters()
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(utf8Encoding.GetBytes(LIVEKIT_API_SECRET)),
        ValidateIssuer = true,
        ValidIssuer = LIVEKIT_API_KEY,
        ValidateAudience = false
    };

    var jwtValidator = new JwtSecurityTokenHandler();
    var principal = jwtValidator.ValidateToken(authHeader, tokenValidationParameters, out SecurityToken validatedToken);

    var sha256 = SHA256.Create();
    var hashBytes = sha256.ComputeHash(utf8Encoding.GetBytes(body));
    var hash = Convert.ToBase64String(hashBytes);

    if (principal.HasClaim(c => c.Type == "sha256") && principal.FindFirstValue("sha256") != hash)
    {
        throw new ArgumentException("sha256 checksum of body does not match!");
    }
}

if (LIVEKIT_API_KEY == null || LIVEKIT_API_SECRET == null)
{
    Console.Error.WriteLine("\nERROR: LIVEKIT_API_KEY and LIVEKIT_API_SECRET not set\n");
    Environment.Exit(1);
}
if (LIVEKIT_API_SECRET.Length < 32)
{
    Console.Error.WriteLine("\nERROR: LIVEKIT_API_SECRET must be at least 32 characters long\n");
    Environment.Exit(1);
}

app.Run();
