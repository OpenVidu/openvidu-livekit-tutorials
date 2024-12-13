using System.Text.Json;
using Livekit.Server.Sdk.Dotnet;

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

IConfiguration config = new ConfigurationBuilder()
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json")
    .AddEnvironmentVariables()
    .Build();

// Load env variables
var SERVER_PORT = config.GetValue<int>("SERVER_PORT");
var LIVEKIT_API_KEY = config.GetValue<string>("LIVEKIT_API_KEY");
var LIVEKIT_API_SECRET = config.GetValue<string>("LIVEKIT_API_SECRET");

// Enable CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        name: MyAllowSpecificOrigins,
        builder =>
        {
            builder.WithOrigins("*").AllowAnyHeader();
        }
    );
});

builder.WebHost.UseKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(SERVER_PORT);
});

var app = builder.Build();
app.UseCors(MyAllowSpecificOrigins);

app.MapPost(
    "/token",
    async (HttpRequest request) =>
    {
        var body = new StreamReader(request.Body);
        string postData = await body.ReadToEndAsync();
        Dictionary<string, dynamic> bodyParams =
            JsonSerializer.Deserialize<Dictionary<string, dynamic>>(postData)
            ?? new Dictionary<string, dynamic>();

        if (
            bodyParams.TryGetValue("roomName", out var roomName)
            && bodyParams.TryGetValue("participantName", out var participantName)
        )
        {
            var token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
                .WithIdentity(participantName.ToString())
                .WithName(participantName.ToString())
                .WithGrants(new VideoGrants { RoomJoin = true, Room = roomName.ToString() });

            var jwt = token.ToJwt();
            return Results.Json(new { token = jwt });
        }
        else
        {
            return Results.BadRequest(
                new { errorMessage = "roomName and participantName are required" }
            );
        }
    }
);

app.MapPost(
    "/livekit/webhook",
    async (HttpRequest request) =>
    {
        var webhookReceiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        try
        {
            StreamReader body = new StreamReader(request.Body);
            string postData = await body.ReadToEndAsync();
            string authHeader =
                request.Headers["Authorization"].FirstOrDefault()
                ?? throw new Exception("Authorization header is missing");

            WebhookEvent webhookEvent = webhookReceiver.Receive(postData, authHeader);

            Console.Out.WriteLine(webhookEvent);

            return Results.Ok();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("Error validating webhook event: " + e.Message);
            return Results.Unauthorized();
        }
    }
);

app.Run();
