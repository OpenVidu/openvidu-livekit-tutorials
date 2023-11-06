package io.openvidu.js.java;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import javax.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
public class LoginController {

	public class MyUser {

		String name;
		String pass;
		String role;

		public MyUser(String name, String pass, String role) {
			this.name = name;
			this.pass = pass;
			this.role = role;
		}
	}

	public static Map<String, MyUser> users = new ConcurrentHashMap<>();

	public LoginController() {
		users.put("publisher1", new MyUser("publisher1", "pass", "PUBLISHER"));
		users.put("publisher2", new MyUser("publisher2", "pass", "PUBLISHER"));
		users.put("subscriber", new MyUser("subscriber", "pass", "SUBSCRIBER"));
	}

	@PostMapping("/login")
	public ResponseEntity<?> login(@RequestBody(required = true) Map<String, String> params, HttpSession httpSession) {

		String user = params.get("user");
		String pass = params.get("pass");
		Map<String, String> response = new HashMap<String, String>();

		if (login(user, pass)) {
			// Successful login
			// Validate session and return OK
			// Value stored in req.session allows us to identify the user in future requests
			httpSession.setAttribute("loggedUser", user);
			return new ResponseEntity<>(new HashMap<String, String>(), HttpStatus.OK);
		} else {
			// Credentials are NOT valid
			// Invalidate session and return error
			httpSession.invalidate();
			response.put("message", "Invalid credentials");
			return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpSession session) {
		System.out.println("'" + session.getAttribute("loggedUser") + "' has logged out");
		session.invalidate();
		return new ResponseEntity<>(HttpStatus.OK);
	}

	private boolean login(String user, String pass) {
		if(user.isEmpty() || pass.isEmpty()) return false;
		return (users.containsKey(user) && users.get(user).pass.equals(pass));
	}

}
