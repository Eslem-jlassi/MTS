package com.billcom.mts.dto.client;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateClientAccountRequest {

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format d'email invalide")
    @Size(max = 100)
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 8, max = 100, message = "Le mot de passe doit contenir entre 8 et 100 caracteres")
    private String password;

    @NotBlank(message = "La confirmation du mot de passe est obligatoire")
    private String confirmPassword;

    @NotBlank(message = "Le prenom est obligatoire")
    @Size(max = 50)
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 50)
    private String lastName;

    @Size(max = 20)
    private String phone;

    @NotBlank(message = "Le nom de l'entreprise est obligatoire")
    @Size(max = 100)
    private String companyName;

    private String address;
}
