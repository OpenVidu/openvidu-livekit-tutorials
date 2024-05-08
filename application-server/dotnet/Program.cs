using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

IConfiguration config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .AddEnvironmentVariables().Build();

// Load env variables
var SERVER_PORT = config.GetValue<int>("SERVER_PORT");
var LIVEKIT_API_KEY = config.GetValue<string>("LIVEKIT_API_KEY");
var LIVEKIT_API_SECRET = config.GetValue<string>("LIVEKIT_API_SECRET"); // ATTENTION! Make sure that this string is at least 32 characters long

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

app.Run();